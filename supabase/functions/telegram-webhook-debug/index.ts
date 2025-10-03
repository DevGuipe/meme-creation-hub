import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`📦 [${new Date().toISOString()}] Webhook called: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    
    // Parse the body
    const body = await req.text();
    console.log(`📨 Raw body received: ${body}`);
    
    let update;
    try {
      update = JSON.parse(body);
      console.log(`✅ Parsed update: ${JSON.stringify(update, null, 2)}`);
    } catch (e) {
      console.error(`❌ JSON parse error: ${e}`);
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
    }

    // Simple message echo for testing
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const fromId = update.message.from.id;
      
      console.log(`💬 Message from ${fromId} in chat ${chatId}: "${text}"`);
      
      // Check if it's a /meme command
      if (text && text.startsWith('/meme')) {
        console.log(`🎯 MEME COMMAND DETECTED: "${text}"`);
        
        // Send immediate response to confirm we received it
        const responseMessage = {
          chat_id: chatId,
          text: `✅ RECEIVED COMMAND: "${text}" from user ${fromId}`,
          reply_to_message_id: update.message.message_id
        };
        
        console.log(`📤 Sending response: ${JSON.stringify(responseMessage)}`);
        
        const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(responseMessage)
        });
        
        const telegramResult = await telegramResponse.json();
        console.log(`📨 Telegram API response: ${JSON.stringify(telegramResult)}`);
      }
    }

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error(`❌ Error processing webhook: ${error}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(`Error: ${errorMessage}`, {
      status: 500, 
      headers: corsHeaders 
    });
  }
});