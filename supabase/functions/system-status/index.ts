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
    console.log('Checking system status...');

    // Check cron jobs
    const { data: cronJobs, error: cronError } = await supabase
      .from('cron.job')
      .select('jobname, schedule, active, last_run_status')
      .eq('jobname', 'weekly-competition-reset');

    // Check recent weekly resets
    const { data: recentSnapshots, error: snapshotsError } = await supabase
      .from('leaderboard_snapshots')
      .select('week_id, created_at, score, rank')
      .order('created_at', { ascending: false })
      .limit(5);

    // Check current week stats
    const { data: currentWeekStats, error: weekError } = await supabase
      .rpc('get_current_week_rankings');

    // Check weekly winner events
    const { data: weeklyWinners, error: winnersError } = await supabase
      .from('popcat_events')
      .select('amount, created_at')
      .eq('source', 'weekly_winner')
      .order('created_at', { ascending: false })
      .limit(10);

    // System health checks
    const { data: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('id', { count: 'exact' });

    const { data: totalMemes, error: memesError } = await supabase
      .from('memes')
      .select('id', { count: 'exact' })
      .is('deleted_at', null);

    // Calculate current week dates
    const now = new Date();
    const currentWeekStart = new Date(now);
    const dayOfWeek = currentWeekStart.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + daysToMonday);
    currentWeekStart.setUTCHours(0, 0, 0, 0);

    const nextReset = new Date(currentWeekStart);
    nextReset.setUTCDate(currentWeekStart.getUTCDate() + 7);

    const systemStatus = {
      timestamp: now.toISOString(),
      status: 'operational',
      weeklyCompetition: {
        currentWeekStart: currentWeekStart.toISOString(),
        nextReset: nextReset.toISOString(),
        activeParticipants: currentWeekStats?.length || 0,
        totalSnapshots: recentSnapshots?.length || 0,
        weeklyWinnersAwarded: weeklyWinners?.length || 0,
        cronJobConfigured: (cronJobs && cronJobs.length > 0) || false,
        cronJobActive: cronJobs?.[0]?.active || false
      },
      platform: {
        totalUsers: totalUsers?.length || 0,
        activeMemes: totalMemes?.length || 0,
        lastWeeklyWinners: weeklyWinners?.slice(0, 3)
      },
      recentSnapshots: recentSnapshots?.map(s => ({
        week: s.week_id,
        created: s.created_at,
        topScore: s.score
      })),
      errors: {
        cronError: cronError?.message,
        snapshotsError: snapshotsError?.message,
        weekError: weekError?.message,
        winnersError: winnersError?.message,
        usersError: usersError?.message,
        memesError: memesError?.message
      }
    };

    console.log('System status check completed:', systemStatus);

    return new Response(JSON.stringify(systemStatus, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in system-status function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);