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
      
      // Fallback para sources não mapeados - formatar de forma legível
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
      
      // Validar se a data é válida
      if (isNaN(date.getTime())) {
        logger.warn('Invalid date string received', { dateString });
        return 'Unknown time';
      }
      
      const diffMs = now.getTime() - date.getTime();
      
      // Se a diferença for negativa (data no futuro), tratar como "Just now"
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
      {/* Main Stats */}
      <Card className="p-4 bg-card border-border">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary font-popcat">{stats.totalScore}</div>
            <div className="text-sm text-muted-foreground font-ui">Total POPS</div>
            <div className="text-xs text-accent font-ui">#{stats.rank} Global</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary font-popcat">{stats.weeklyScore}</div>
            <div className="text-sm text-muted-foreground font-ui">This Week</div>
            <div className="text-xs text-accent font-ui">#{stats.weeklyRank} Weekly</div>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <Badge 
            variant="outline" 
            className="text-accent border-accent bg-accent/10 px-3 py-1 font-ui"
          >
            {currentBadge.icon} {currentBadge.name}
          </Badge>
          {nextBadge && (
            <p className="text-xs text-muted-foreground mt-2 font-ui">
              {nextBadge.threshold - stats.totalScore} POPS to {nextBadge.name}
            </p>
          )}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-accent" />
          <h3 className="font-bold font-popcat">Recent POPCAT Activity</h3>
        </div>
        
        {stats.recentEvents && stats.recentEvents.length > 0 ? (
          <div className="space-y-3">
            {stats.recentEvents.map((event, index) => {
              // Validação adicional dos dados do evento
              if (!event || typeof event.source !== 'string' || typeof event.amount !== 'number') {
                logger.warn('Invalid event data detected', { event, index });
                return null;
              }
              
              return (
                <div key={`${event.created_at}-${index}`} className="flex items-center justify-between py-3 border-b border-border last:border-b-0 hover:bg-muted/20 rounded-md transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-accent rounded-full flex-shrink-0"></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium font-ui truncate">{formatSource(event.source)}</p>
                      <p className="text-xs text-muted-foreground font-ui">
                        {formatTimeAgo(event.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`font-ui font-bold flex-shrink-0 ${
                      event.amount > 0 
                        ? 'text-accent border-accent bg-accent/10' 
                        : 'text-muted-foreground border-muted-foreground'
                    }`}
                  >
                    {event.amount > 0 ? '+' : ''}{event.amount} POPS
                  </Badge>
                </div>
              );
            }).filter(Boolean)}
            <div className="pt-2 text-center">
              <p className="text-xs text-muted-foreground font-ui">
                🎯 Keep earning POPS to climb the rankings!
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="mb-3">🐱</div>
            <p className="text-sm text-muted-foreground font-ui mb-2">
              No recent activity yet
            </p>
            <p className="text-xs text-muted-foreground font-ui">
              Start creating epic POPCAT memes to earn POPS! 🎨
            </p>
          </div>
        )}
      </Card>

      {/* Global Leaderboard */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">👑</span>
          <h3 className="font-bold font-popcat">Global POPCAT Leaderboard</h3>
        </div>
        
        {leaderboard.length > 0 ? (
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((user, index) => (
              <div key={user.user_id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-sm font-ui font-medium">
                    {user.first_name || `User${user.telegram_id.toString().slice(-4)}`}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-accent font-ui">
                    {user.total_score} POPS
                  </div>
                  <div className="text-xs text-muted-foreground font-ui">
                    +{user.weekly_score} this week
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground font-ui">
            No ranking data available yet.
          </p>
        )}
      </Card>
    </div>
  );
};

