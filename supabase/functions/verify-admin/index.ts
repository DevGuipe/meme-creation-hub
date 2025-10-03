import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();
    const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD');

    if (!ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Admin password not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isValid = password === ADMIN_PASSWORD;

    return new Response(
      JSON.stringify({ valid: isValid }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error verifying admin password:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
