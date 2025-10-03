import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Testing weekly reset system...');

    // Test current week calculation
    const { data: currentWeek, error: currentWeekError } = await supabase
      .rpc('get_current_week_rankings');

    if (currentWeekError) {
      throw new Error(`Current week query failed: ${currentWeekError.message}`);
    }

    // Test historical period query  
    const testStart = '2025-09-23T00:00:00.000Z'; // Last Monday
    const testEnd = '2025-09-29T23:59:59.999Z';   // This Sunday

    const { data: periodData, error: periodError } = await supabase
      .rpc('get_weekly_rankings_for_period', {
        start_date: testStart,
        end_date: testEnd
      });

    if (periodError) {
      throw new Error(`Period query failed: ${periodError.message}`);
    }

    // Calculate week dates like the reset function would
    const now = new Date();
    const currentWeekStart = new Date(now);
    const dayOfWeek = currentWeekStart.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + daysToMonday);
    currentWeekStart.setUTCHours(0, 0, 0, 0);

    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setUTCDate(currentWeekStart.getUTCDate() - 7);
    
    const previousWeekEnd = new Date(currentWeekStart);
    previousWeekEnd.setUTCDate(currentWeekStart.getUTCDate() - 1);
    previousWeekEnd.setUTCHours(23, 59, 59, 999);

    // Test if we have any weekly winners in popcat_events
    const { data: weeklyWinners, error: winnersError } = await supabase
      .from('popcat_events')
      .select('*')
      .eq('source', 'weekly_winner');

    const result = {
      success: true,
      currentTime: now.toISOString(),
      currentWeekStart: currentWeekStart.toISOString(),
      previousWeekStart: previousWeekStart.toISOString(), 
      previousWeekEnd: previousWeekEnd.toISOString(),
      currentWeekRankings: currentWeek?.length || 0,
      periodRankings: periodData?.length || 0,
      weeklyWinnersCount: weeklyWinners?.length || 0,
      sampleCurrentWeek: currentWeek?.slice(0, 3),
      samplePeriodData: periodData?.slice(0, 3),
      diagnostics: {
        dayOfWeek,
        daysToMonday,
        functions_working: !currentWeekError && !periodError,
        has_weekly_winners: (weeklyWinners?.length || 0) > 0
      }
    };

    console.log('Test completed:', result);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in weekly-reset-test:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);