import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memeId, telegramUserId } = await req.json();

    console.log('Delete meme request:', { memeId, telegramUserId });

    if (!memeId || !telegramUserId) {
      console.error('Missing required fields:', { memeId, telegramUserId });
      return new Response(
        JSON.stringify({ error: 'Missing memeId or telegramUserId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service_role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user UUID from telegram_id
    const { data: userUuid, error: userError } = await supabase
      .rpc('get_user_id_by_telegram_id', { telegram_user_id: telegramUserId });

    if (userError || !userUuid) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User UUID:', userUuid);

    // Verify meme ownership
    const { data: meme, error: memeError } = await supabase
      .from('memes')
      .select('owner_id')
      .eq('id', memeId)
      .single();

    if (memeError || !meme) {
      console.error('Meme not found:', memeError);
      return new Response(
        JSON.stringify({ error: 'Meme not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (meme.owner_id !== userUuid) {
      console.error('Ownership mismatch:', { memeOwnerId: meme.owner_id, userUuid });
      return new Response(
        JSON.stringify({ error: 'You can only delete your own memes' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perform soft delete
    const { error: deleteError } = await supabase
      .from('memes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', memeId);

    if (deleteError) {
      console.error('Delete failed:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete meme' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Meme deleted successfully:', memeId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in delete-meme:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
