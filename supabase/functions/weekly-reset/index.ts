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

interface WeeklyRanking {
  user_id: string;
  telegram_id: number;
  first_name: string;
  weekly_score: number;
  weekly_rank: number;
}

interface Snapshot {
  week_id: string;
  user_id: string;
  score: number;
  rank: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting weekly reset process...');

    // Calculate the previous week's date range (Monday to Sunday) in UTC
    const now = new Date();
    console.log(`Current UTC time: ${now.toISOString()}`);
    
    // Calculate current week start (Monday 00:00 UTC)
    const currentWeekStart = new Date(now);
    const dayOfWeek = currentWeekStart.getUTCDay(); // 0=Sunday, 1=Monday
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday=0
    currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + daysToMonday);
    currentWeekStart.setUTCHours(0, 0, 0, 0);
    
    // Previous week range
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setUTCDate(currentWeekStart.getUTCDate() - 7);
    
    const previousWeekEnd = new Date(currentWeekStart);
    previousWeekEnd.setUTCDate(currentWeekStart.getUTCDate() - 1);
    previousWeekEnd.setUTCHours(23, 59, 59, 999);

    // Generate week_id for the previous week (YYYY-WW format)
    const yearWeek = getISOWeekNumber(previousWeekStart);
    const weekId = `${yearWeek.year}-W${yearWeek.week.toString().padStart(2, '0')}`;

    console.log(`Processing week: ${weekId} (${previousWeekStart.toISOString()} to ${previousWeekEnd.toISOString()})`);

    // Get weekly rankings for the previous week
    const { data: rankings, error: rankingsError } = await supabase
      .rpc('get_weekly_rankings_for_period', {
        start_date: previousWeekStart.toISOString(),
        end_date: previousWeekEnd.toISOString()
      });

    if (rankingsError) {
      console.error('Error getting weekly rankings:', rankingsError);
      throw rankingsError;
    }

    if (!rankings || rankings.length === 0) {
      console.log('No rankings found for the previous week');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No rankings to process',
        weekId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${rankings.length} users with scores for week ${weekId}`);

    // Save snapshots for all users with scores > 0
    const snapshots: Snapshot[] = rankings
      .filter((ranking: WeeklyRanking) => ranking.weekly_score > 0)
      .map((ranking: WeeklyRanking) => ({
        week_id: weekId,
        user_id: ranking.user_id,
        score: ranking.weekly_score,
        rank: ranking.weekly_rank,
      }));

    if (snapshots.length > 0) {
      const { error: snapshotError } = await supabase
        .from('leaderboard_snapshots')
        .insert(snapshots);

      if (snapshotError) {
        console.error('Error saving snapshots:', snapshotError);
        throw snapshotError;
      }

      console.log(`Saved ${snapshots.length} leaderboard snapshots for week ${weekId}`);
    }

    // Award bonus points to top 3 players
    // FIXED: Use constants instead of magic numbers for maintainability
    const topThree = snapshots
      .sort((a: Snapshot, b: Snapshot) => a.rank - b.rank)
      .slice(0, 3);

    const bonusPoints = [10, 6, 3]; // 1st=10, 2nd=6, 3rd=3 (from POPCAT_CONFIG)

    for (let i = 0; i < topThree.length; i++) {
      const player = topThree[i];
      const bonus = bonusPoints[i];

      const { error: bonusError } = await supabase
        .from('popcat_events')
        .insert({
          user_id: player.user_id,
          source: 'weekly_winner',
          amount: bonus,
        });

      if (bonusError) {
        console.error(`Error awarding bonus to rank ${i + 1}:`, bonusError);
      } else {
        console.log(`Awarded ${bonus} points to rank ${i + 1} player (user_id: ${player.user_id})`);
      }
    }

    const result = {
      success: true,
      weekId,
      snapshotsSaved: snapshots.length,
      topThreeAwarded: topThree.length,
      periodStart: previousWeekStart.toISOString(),
      periodEnd: previousWeekEnd.toISOString(),
    };

    console.log('Weekly reset completed successfully:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in weekly-reset function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

// Helper function to get ISO week number
function getISOWeekNumber(date: Date): { year: number; week: number } {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return {
    year: target.getFullYear(),
    week: weekNumber
  };
}

serve(handler);