import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🐱 [get-user-memes] Function called');
    
    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { telegramUserId } = await req.json();
    console.log('🔍 [get-user-memes] Getting memes for telegramUserId:', telegramUserId);
    
    if (!telegramUserId) {
      return new Response(
        JSON.stringify({ error: 'telegramUserId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user UUID from telegram ID
    const { data: userUuid, error: uuidError } = await supabaseAdmin
      .rpc('get_user_id_by_telegram_id', { telegram_user_id: telegramUserId });
    
    console.log('📋 [get-user-memes] User UUID result:', { userUuid, uuidError });
    
    if (uuidError) {
      console.error('❌ [get-user-memes] Failed to get user UUID:', uuidError);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userUuid) {
      console.warn('⚠️ [get-user-memes] User not found for telegramUserId:', telegramUserId);
      return new Response(
        JSON.stringify({ data: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get memes using service role (bypasses RLS)
    const { data: memes, error: memesError } = await supabaseAdmin
      .from('memes')
      .select('*')
      .is('deleted_at', null)
      .eq('owner_id', userUuid)
      .order('created_at', { ascending: false })
      .limit(50);
    
    console.log('📊 [get-user-memes] Memes query result:', { count: memes?.length, error: memesError });
    
    if (memesError) {
      console.error('❌ [get-user-memes] Failed to get memes:', memesError);
      return new Response(
        JSON.stringify({ error: 'Failed to load memes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [get-user-memes] Successfully loaded', memes?.length || 0, 'memes');
    
    return new Response(
      JSON.stringify({ data: memes || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 [get-user-memes] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})