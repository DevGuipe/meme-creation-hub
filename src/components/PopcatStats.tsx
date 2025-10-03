import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { validateTelegramId } from '@/lib/validations';
import { TELEGRAM_ID_RANGE } from '@/lib/constants';
import { logger } from '@/lib/logger';
import type { PopcatStats as PopcatStatsType } from '@/types';

interface LeaderboardUser {
  user_id: string;
  telegram_id: number;
  first_name: string;
  total_score: number;
  weekly_score: number;
  global_rank: number;
  weekly_rank: number;
}

interface PopcatStatsProps {
  userId?: number; // FIXED: Use number consistently instead of string to avoid unnecessary conversions
}

const BADGES = [
  { name: 'Baby Popcat', threshold: 10, icon: '🐱' },
  { name: 'Popcat Explorer', threshold: 100, icon: '🎭' },
  { name: 'Meme Wizard', threshold: 500, icon: '🧙‍♂️' },
  { name: 'Popcat Legend', threshold: 1000, icon: '👑' },
  { name: 'Supreme Popcat', threshold: 5000, icon: '⚡' }
];

const SOURCE_LABELS = {
  'save_meme': '💾 Meme Saved',
  'face_upload': '📸 Face Upload Bonus', 
  'publish': '🚀 Publish',
  'publish_group': '👥 Group Publish',
  'reaction': '❤️ Reaction',
  'reaction_thumbs': '👍 Reaction',
  'reaction_laugh': '😂 Reaction',
  'reaction_popcat': '🐱 POPCAT Reaction',
  'reaction_flex': '💪 Flex Reaction',
  'reaction_moai': '🗿 Moai Reaction',
  'weekly_challenge': '🏆 Weekly Challenge',
  'tournament': '🎯 Tournament',
  'weekly_winner': '👑 Weekly Winner'
};

export const PopcatStats = ({ userId }: PopcatStatsProps) => {
  const [stats, setStats] = useState<PopcatStatsType | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
    
    // Realtime disabled to prevent WebSocket errors in insecure contexts
    // Stats will update on component mount/userId change
  }, [userId]);

  const loadStats = async () => {
    try {
      setIsLoading(true);

      // FIXED: Use number directly without unnecessary string conversions
      const userTelegramId = userId || TELEGRAM_ID_RANGE.DEV_MOCK_ID;
      if (!validateTelegramId(userTelegramId)) {
        logger.warn('Invalid telegram ID provided, using mock data', { userId });
        // Use mock data for development
        setStats({
          totalScore: 0,
          weeklyScore: 0,
          rank: 999,
          weeklyRank: 999,
          badge: 'Baby Popcat',
          recentEvents: []
        });
        return;
      }

      // Get user data using secure function
      const { data: userUuid, error: userError } = await supabase
        .rpc('get_user_id_by_telegram_id', { 
          telegram_user_id: userTelegramId 
        });

      if (userError) {
        logger.error('Error fetching user data', userError);
        throw new Error('Failed to fetch user data');
      }

      if (!userUuid) {
        logger.info('No user found, using mock data for development');
        setStats({
          totalScore: 342,
          weeklyScore: 15,
          rank: 1,
          weeklyRank: 1,
          badge: 'Supreme Popcat',
          recentEvents: []
        });
        return;
      }

      // Get user ranking using the new function
      const { data: rankingData, error: rankingError } = await supabase
        .rpc('get_user_ranking', { user_telegram_id: userTelegramId })
        .maybeSingle();

      if (rankingError) {
        logger.warn('Could not get user ranking', rankingError);
      }

      // Get recent events
      logger.info('Fetching recent events for user', { userUuid });
      const { data: eventsData, error: eventsError } = await supabase
        .from('popcat_events')
        .select('source, amount, created_at')
        .eq('user_id', userUuid)
        .order('created_at', { ascending: false })
        .limit(5);

      if (eventsError) {
        logger.error('❌ Could not fetch recent events', eventsError);
      } else {
        logger.info('✅ Recent events fetched successfully', { 
          eventsCount: eventsData?.length || 0, 
          eventsData,
          firstEvent: eventsData?.[0],
          dataTypes: eventsData?.map(e => ({
            source: typeof e.source,
            amount: typeof e.amount,
            created_at: typeof e.created_at
          }))
        });
      }

      // FIXED: Validate event structure with proper runtime checks
      const validEvents = eventsData?.filter(event => {
        const isValid = event && 
          typeof event.source === 'string' && 
          event.source.length > 0 &&
          typeof event.amount === 'number' && 
          !isNaN(event.amount) &&
          typeof event.created_at === 'string' &&
          event.created_at.length > 0;
        
        if (!isValid) {
          logger.warn('Invalid event data filtered out', { event });
        }
        
        return isValid;
      }) || [];
      
      logger.info('Events after validation', { 
        originalCount: eventsData?.length || 0,
        validCount: validEvents.length 
      });

      // Get leaderboard data (global ranking)
      logger.info('Fetching global leaderboard');
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .rpc('get_user_rankings')
        .limit(10);

      if (leaderboardError) {
        logger.error('Could not fetch leaderboard', leaderboardError);
        setLeaderboard([]);
      } else {
        logger.info('Leaderboard fetched', { leaderboardCount: leaderboardData?.length || 0 });
        setLeaderboard(leaderboardData || []);
      }

      const totalScore = rankingData?.total_score || 0;
      const weeklyScore = rankingData?.weekly_score || 0;
      const globalRank = rankingData?.global_rank || 1;
      const weeklyRank = rankingData?.weekly_rank || 1;

      // Determine badge based on total score
      const currentBadge = BADGES
        .slice()
        .reverse()
        .find(badge => totalScore >= badge.threshold) || BADGES[0];

      setStats({
        totalScore,
        weeklyScore,
        rank: globalRank,
        weeklyRank: weeklyRank,
        badge: currentBadge.name,
        recentEvents: validEvents
      });
      
      logger.info('✅ Stats updated successfully', {
        totalScore,
        weeklyScore,
        globalRank,
        weeklyRank,
        badge: currentBadge.name,
        recentEventsCount: validEvents.length
      });
    } catch (error: unknown) {
      // FIXED: Properly handle unknown error type
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Failed to load POPCAT stats', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
      // Set fallback data to prevent crashes
      setStats({
        totalScore: 0,
        weeklyScore: 0,
        rank: 1,
        weeklyRank: 1,
        badge: 'Baby Popcat',
        recentEvents: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatSource = (source: string) => {
    try {
      const formatted = SOURCE_LABELS[source as keyof typeof SOURCE_LABELS];
      if (formatted) return formatted;
      
      // Fallback for unmapped sources - format in readable way
      const fallback = `🎯 ${source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
      logger.info('Using fallback source formatting', { source, fallback });
      return fallback;
    } catch (error) {
      logger.error('Error formatting source', { source, error });
      return '🎯 Unknown Activity';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      // Validate date
      if (isNaN(date.getTime())) {
        logger.warn('Invalid date string received', { dateString });
        return 'Unknown time';
      }
      
      const diffMs = now.getTime() - date.getTime();
      
      // If negative (future date), treat as "Just now"
      if (diffMs < 0) {
        logger.warn('Future date detected', { dateString, diffMs });
        return 'Just now';
      }
      
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > 0) return `${diffDays}d ago`;
      if (diffHours > 0) return `${diffHours}h ago`;
      if (diffMinutes > 0) return `${diffMinutes}m ago`;
      return 'Just now';
    } catch (error) {
      logger.error('Error formatting time', { dateString, error });
      return 'Unknown time';
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4 bg-card border-border animate-pulse">
        <div className="h-6 bg-muted rounded mb-2" />
        <div className="h-8 bg-muted rounded mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </Card>
    );
  }

  if (!stats) return null;

  const currentBadge = BADGES
    .slice()
    .reverse()
    .find(badge => stats.totalScore >= badge.threshold) || BADGES[0];

  const nextBadge = BADGES.find(badge => stats.totalScore < badge.threshold);

  return (
    <div className="space-y-4">
      {/* Main Stats with Modern Design */}
      <Card className="glass-effect border-2 border-white/40 hover-lift overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-purple-500/10 p-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-4 rounded-xl bg-white/50 hover-scale">
              <div className="text-3xl font-bold font-popcat gradient-text mb-1">{stats.totalScore}</div>
              <div className="text-xs text-muted-foreground font-ui uppercase tracking-wide">Total POPS</div>
              <Badge variant="outline" className="mt-2 border-primary text-primary bg-primary/5">
                #{stats.rank} Global
              </Badge>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/50 hover-scale">
              <div className="text-3xl font-bold font-popcat gradient-text-sunset mb-1">{stats.weeklyScore}</div>
              <div className="text-xs text-muted-foreground font-ui uppercase tracking-wide">This Week</div>
              <Badge variant="purple" className="mt-2">
                #{stats.weeklyRank} Weekly
              </Badge>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Badge 
              variant="default" 
              className="px-4 py-2 text-sm font-popcat shadow-lg hover:shadow-xl"
            >
              {currentBadge.icon} {currentBadge.name}
            </Badge>
            {nextBadge && (
              <div className="mt-3 p-3 rounded-lg bg-white/40">
                <p className="text-xs text-foreground font-ui font-semibold">
                  🎯 {nextBadge.threshold - stats.totalScore} POPS to unlock <span className="font-popcat">{nextBadge.name}</span>
                </p>
                <div className="w-full bg-muted/30 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.totalScore / nextBadge.threshold) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Recent Activity with Enhanced Visuals */}
      <Card className="glass-effect border-2 border-white/40 hover-lift overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-accent to-purple-500">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-popcat text-lg gradient-text">Recent Activity</h3>
          </div>
          
          {stats.recentEvents && stats.recentEvents.length > 0 ? (
            <div className="space-y-2">
              {stats.recentEvents.map((event, index) => {
                if (!event || typeof event.source !== 'string' || typeof event.amount !== 'number') {
                  logger.warn('Invalid event data detected', { event, index });
                  return null;
                }
                
                return (
                  <div 
                    key={`${event.created_at}-${index}`} 
                    className="flex items-center justify-between p-4 rounded-xl bg-white/60 hover:bg-white/80 transition-all hover-scale border border-white/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-2 h-2 bg-gradient-to-br from-primary to-accent rounded-full flex-shrink-0 animate-pulse"></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold font-ui text-foreground truncate">{formatSource(event.source)}</p>
                        <p className="text-xs text-muted-foreground font-ui">
                          {formatTimeAgo(event.created_at)}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={event.amount > 0 ? "default" : "outline"}
                      className="font-ui font-bold flex-shrink-0 ml-2"
                    >
                      {event.amount > 0 ? '+' : ''}{event.amount}
                    </Badge>
                  </div>
                );
              }).filter(Boolean)}
              <div className="pt-3 text-center">
                <p className="text-xs text-muted-foreground font-ui italic">
                  🎯 Keep stacking POPS to dominate the rankings!
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 px-4">
              <div className="mb-4 text-6xl opacity-50 animate-bounce-gentle">🐱</div>
              <p className="text-base font-semibold text-foreground font-ui mb-2">
                No Activity Yet
              </p>
              <p className="text-sm text-muted-foreground font-ui">
                Start creating legendary POPCAT memes to earn POPS! 🎨
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Global Leaderboard with Modern Design */}
      <Card className="glass-effect border-2 border-white/40 hover-lift overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl animate-bounce-gentle filter drop-shadow-md">👑</span>
            <h3 className="font-popcat text-lg gradient-text">Global Leaderboard</h3>
          </div>
          
          {leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((user, index) => (
                <div 
                  key={user.user_id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-white/60 hover:bg-white/80 transition-all hover-scale border border-white/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-popcat shadow-lg ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                      'bg-gradient-to-br from-muted to-muted-foreground/20 text-foreground'
                    }`}>
                      {index === 0 ? '👑' : index + 1}
                    </div>
                    <span className="text-sm font-ui font-semibold text-foreground truncate">
                      {user.first_name || `User${user.telegram_id.toString().slice(-4)}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold font-popcat gradient-text">
                      {user.total_score}
                    </div>
                    <div className="text-xs text-muted-foreground font-ui">
                      +{user.weekly_score} week
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground font-ui">
                No ranking data available - be the first to POP!
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

