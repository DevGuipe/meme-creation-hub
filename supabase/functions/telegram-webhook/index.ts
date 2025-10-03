import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withRetry } from '../_shared/retry.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data: string;
  };
}

// Input validation functions
const isValidTelegramId = (id: number): boolean => {
  return Number.isInteger(id) && id > 0 && id < 10000000000;
};

const isValidMemeId = (id: string): boolean => {
  return /^\d{4,6}$/.test(id);
};

// CRITICAL FIX: Must be consistent with frontend validation
// Throw error instead of silent fallback to match src/lib/validations.ts
const sanitizeText = (text: string): string => {
  const sanitized = text.replace(/[<>'"&]/g, '').trim().slice(0, 280);
  if (sanitized.length === 0) {
    throw new Error('Text contains only invalid characters');
  }
  return sanitized;
};

serve(async (req) => {
  console.log('📦 Webhook received:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      console.error('❌ Bot token not configured');
      return new Response('Bot token not configured', { status: 500 });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials not configured');
      return new Response('Database not configured', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse webhook update
    const body = await req.text();
    console.log('📨 Raw webhook body:', body);
    
    let update: TelegramUpdate;
    try {
      update = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
    }
    
    console.log('📊 Parsed update:', JSON.stringify(update, null, 2));

    // Handle callback queries (inline button presses)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const userId = callbackQuery.from.id;
      const data = callbackQuery.data;

      // Validate user ID
      if (!isValidTelegramId(userId)) {
        console.error('Invalid telegram user ID in callback:', userId);
        return new Response('Invalid user ID', { status: 400 });
      }

      // Parse reaction data: "react_type_memeId" format
      const reactionMatch = data.match(/^react_(thumbs_up|laugh|flex|popcat|moai)_(.+)$/);
      if (reactionMatch) {
        const reactionType = reactionMatch[1];
        const memeId = reactionMatch[2];

        // Check for duplicate reactions - FIXED: Use maybeSingle() instead of single()
        const { data: existingReaction } = await supabase
          .from('reactions')
          .select('id')
          .eq('meme_id', memeId)
          .eq('reactor_telegram_id', userId)
          .eq('type', reactionType)
          .maybeSingle();

        if (existingReaction) {
          // Answer callback query with error
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackQuery.id,
              text: `You already reacted with ${reactionType === 'thumbs_up' ? '👍' : reactionType === 'laugh' ? '😂' : reactionType === 'flex' ? '💪' : reactionType === 'popcat' ? '🐱' : '🗿'}`,
              show_alert: false
            })
          });
        } else {
          // Add reaction with retry
          await withRetry(
            async () => {
              await supabase
                .from('reactions')
                .insert({
                  meme_id: memeId,
                  reactor_telegram_id: userId,
                  type: reactionType,
                  message_id: callbackQuery.message.message_id.toString()
                });
            },
            'insert_reaction',
            { maxAttempts: 3, baseDelay: 300 }
          );

          // Add POPS points to meme owner with retry - FIXED: Use maybeSingle() instead of single()
          const { data: meme } = await withRetry(
            async () => {
              const result = await supabase
                .from('memes')
                .select('owner_id')
                .eq('id', memeId)
                .maybeSingle();
              if (result.error) throw result.error;
              return result;
            },
            'fetch_meme_owner',
            { maxAttempts: 2, baseDelay: 200 }
          );

          if (meme) {
            await withRetry(
              async () => {
                await supabase
                  .from('popcat_events')
                  .insert({
                    user_id: meme.owner_id,
                    source: reactionType === 'thumbs_up' ? 'reaction_thumbs' : 
                            reactionType === 'laugh' ? 'reaction_laugh' : 
                            reactionType === 'flex' ? 'reaction_flex' : 
                            reactionType === 'popcat' ? 'reaction_popcat' : 'reaction_moai',
                    amount: 1,
                    meme_id: memeId
                  });
              },
              'insert_popcat_event',
              { maxAttempts: 3, baseDelay: 300 }
            );
          }

          // Answer callback query
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: callbackQuery.id,
              text: `+1 🐱 POPS added! Meow!`,
              show_alert: false
            })
          });
        }
      }

      return new Response('Callback processed', { status: 200, headers: corsHeaders });
    }

    const message = update.message;
    if (!message) {
      console.log('❌ No message in update');
      return new Response('No message in update', { status: 200 });
    }

    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text;

    // Sanitize user input with proper error handling
    let sanitizedFirstName: string;
    let sanitizedUsername: string | undefined;
    
    try {
      sanitizedFirstName = sanitizeText(message.from.first_name);
    } catch (error) {
      // If first name is all invalid characters, use a safe default
      console.warn('⚠️ First name contains only invalid characters, using fallback', { 
        originalName: message.from.first_name 
      });
      sanitizedFirstName = 'User';
    }
    
    try {
      sanitizedUsername = message.from.username ? sanitizeText(message.from.username) : undefined;
    } catch (error) {
      // If username is all invalid characters, leave it undefined
      console.warn('⚠️ Username contains only invalid characters, skipping', { 
        originalUsername: message.from.username 
      });
      sanitizedUsername = undefined;
    }

    // Handle /start command
    if (text === '/start') {
      console.log('🚀 Processing /start command for user:', userId);
      
      // Register or update user in database
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          telegram_id: userId,
          username: sanitizedUsername,
          first_name: sanitizedFirstName
        }, {
          onConflict: 'telegram_id'
        });

      if (upsertError) {
        console.error('❌ Error upserting user:', upsertError);
        return new Response('Database error', { status: 500, headers: corsHeaders });
      } else {
        console.log('✅ User registered/updated successfully');
      }

      // Get WebApp URL from environment or use default
      const webAppUrl = Deno.env.get('WEB_APP_URL') || 'https://popcatmemer.click';
      console.log('🌐 Using WebApp URL:', webAppUrl);

      // Build WebApp URL with user data in query params (fallback for initDataUnsafe issues)
      const webAppUrlWithParams = `${webAppUrl}?tgUserId=${userId}&tgUsername=${encodeURIComponent(sanitizedUsername || '')}&tgFirstName=${encodeURIComponent(sanitizedFirstName)}`;
      console.log('🔗 WebApp URL with params:', webAppUrlWithParams);

      // Send welcome message with WebApp button
      const welcomeMessage = {
        chat_id: chatId,
        text: "🐱 Meow meow! Welcome to POPCAT Memer! Ready to create some epic POPCAT memes? 🚀\n\nTap the button below to join the POP revolution:",
        reply_markup: {
          inline_keyboard: [[
            {
              text: "🐱 Open POPCAT Memer",
              web_app: {
                url: webAppUrlWithParams
              }
            }
          ]]
        }
      };

      console.log('📤 Sending welcome message...');
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(welcomeMessage)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to send Telegram message:', errorText);
        return new Response('Failed to send message', { status: 500, headers: corsHeaders });
      } else {
        console.log('✅ Welcome message sent successfully');
      }

      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Handle /meme <id> command
    const memeMatch = text?.match(/^\/meme\s+(\w+)$/);
    console.log(`🔍 Checking /meme command: { text: "${text}", memeMatch: ${JSON.stringify(memeMatch)}, chatType: "${message.chat.type}" }`);
    
    if (memeMatch) {
      const memeId = memeMatch[1];
      console.log('🗿 Processing /meme command with ID:', memeId);
      
      // Validate meme ID format
      if (!isValidMemeId(memeId)) {
        console.log('❌ Invalid meme ID format:', memeId);
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Invalid meme ID format: ${memeId}`,
            reply_to_message_id: message.message_id
          })
        });
        return new Response('Invalid meme ID', { status: 200, headers: corsHeaders });
      }

      console.log('✅ Valid meme ID:', memeId, 'Looking for user:', userId);

      // FIXED: Use proper join syntax to filter by user ownership
      // First get user UUID from telegram_id
      const { data: userUuidData, error: userUuidError } = await supabase
        .rpc('get_user_id_by_telegram_id', { telegram_user_id: userId });
      
      if (userUuidError || !userUuidData) {
        console.error('❌ Failed to get user UUID', { userId, userUuidError });
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `User not registered. Please use /start first.`,
            reply_to_message_id: message.message_id
          })
        });
        return new Response('User not found', { status: 200, headers: corsHeaders });
      }
      
      // Now query meme with proper ownership check
      const { data: meme, error: memeError } = await supabase
        .from('memes')
        .select('*')
        .eq('id_short', memeId)
        .eq('owner_id', userUuidData)
        .is('deleted_at', null)
        .maybeSingle();

      console.log('🔍 Meme query result:', { meme, memeError, memeId, userId });

      if (memeError || !meme) {
        // Send error message
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Meme #${memeId} not found in your gallery. Open POPCAT Memer to create/save some epic POPs! 🐱`,
            reply_to_message_id: message.message_id
          })
        });

        return new Response('Meme not found', { status: 200, headers: corsHeaders });
      }

      // Resolve meme image URL: prefer pre-rendered image (new format), else call generator
      let imageUrl: string | null = null;

      try {
        const preview = (meme as any).image_url;
        if (typeof preview === 'string') {
          if (/^https?:\/\//.test(preview)) {
            imageUrl = preview;
          } else if (preview.startsWith('/')) {
            const webUrl = Deno.env.get('WEB_APP_URL') || 'https://popcatmemer.click';
            imageUrl = `${webUrl}${preview}`;
          }
        }
      } catch (_) {}

      if (!imageUrl) {
        try {
          const generateResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-meme-image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({ memeId: meme.id })
          });
          
          if (generateResponse.ok) {
            const imageData = await generateResponse.json();
            imageUrl = imageData.imageUrl;
            console.log('🖼️ Generated image URL:', imageUrl);
          } else {
            const errTxt = await generateResponse.text();
            console.warn('⚠️ generate-meme-image failed:', generateResponse.status, errTxt);
          }
        } catch (error) {
          console.warn('Failed to generate meme image, falling back to text:', error);
        }
      }

      // Send meme with image or text fallback
      if (imageUrl) {
        // Send photo with caption
        const photoMessage = {
          chat_id: chatId,
          photo: imageUrl,
          caption: `🐱 POPCAT Meme #${memeId} by @${sanitizedUsername || sanitizedFirstName} 💥`,
          reply_markup: {
          inline_keyboard: [[
            { text: "👍", callback_data: `react_thumbs_up_${meme.id}` },
            { text: "😂", callback_data: `react_laugh_${meme.id}` },
            { text: "💪", callback_data: `react_flex_${meme.id}` },
            { text: "🐱", callback_data: `react_popcat_${meme.id}` },
            { text: "🗿", callback_data: `react_moai_${meme.id}` }
          ]]
          }
        };

        const photoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(photoMessage)
        });
        if (!photoRes.ok) {
          const err = await photoRes.text();
          console.error('❌ Failed to sendPhoto:', photoRes.status, err);
          // Fallback to text message if photo fails
          const fallbackMsg = {
            chat_id: chatId,
            text: `🐱 POPCAT Meme #${memeId} by @${sanitizedUsername || sanitizedFirstName} 💥`,
            reply_markup: photoMessage.reply_markup
          };
          const fbRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackMsg)
          });
          if (!fbRes.ok) {
            const fbErr = await fbRes.text();
            console.error('❌ Fallback sendMessage failed:', fbRes.status, fbErr);
            // Try notifying user privately
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: userId,
                text: `Não consegui publicar seu meme #${memeId} no grupo (permissão/erro). Avise um admin para permitir o bot enviar mensagens.`
              })
            });
          }
        } else {
          console.log('✅ Meme photo sent successfully');
        }
      } else {
        // Fallback to text message
        const publishMessage = {
          chat_id: chatId,
          text: `🐱 POPCAT Meme #${memeId} by @${sanitizedUsername || sanitizedFirstName} 💥`,
          reply_markup: {
            inline_keyboard: [[
              { text: "👍", callback_data: `react_thumbs_up_${meme.id}` },
              { text: "😂", callback_data: `react_laugh_${meme.id}` },
              { text: "💪", callback_data: `react_flex_${meme.id}` },
              { text: "🐱", callback_data: `react_popcat_${meme.id}` },
              { text: "🗿", callback_data: `react_moai_${meme.id}` }
            ]]
          }
        };

        const textRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(publishMessage)
        });
        if (!textRes.ok) {
          const tErr = await textRes.text();
          console.error('❌ Failed to sendMessage (fallback):', textRes.status, tErr);
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: userId,
              text: `Não consegui publicar seu meme #${memeId} no grupo (permissão/erro). Avise um admin para permitir o bot enviar mensagens.`
            })
          });
        } else {
          console.log('✅ Meme text sent successfully');
        }
      }

      // Add POPS points for publishing with retry
      await withRetry(
        async () => {
          await supabase
            .from('popcat_events')
            .insert({
              user_id: meme.owner_id,
              source: 'publish_group',
              amount: 1,
              meme_id: meme.id
            });
        },
        'insert_publish_pops',
        { maxAttempts: 3, baseDelay: 300 }
      );

      return new Response('Meme published', { status: 200, headers: corsHeaders });
    }

    // Handle /meme command in private chat (error)
    if (text?.startsWith('/meme') && message.chat.type === 'private') {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Use /meme <id> in the group to publish a saved meme."
        })
      });

      return new Response('Command guidance sent', { status: 200, headers: corsHeaders });
    }

    return new Response('Update processed', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    const errMsg = error instanceof Error ? (error as Error).message : String(error);
    const errStack = error instanceof Error ? (error as Error).stack : undefined;
    console.error('❌ Error stack:', errStack);
    return new Response(JSON.stringify({ 
      error: 'Internal error', 
      details: errMsg 
    }), { 
      status: 500, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    });
  }
});