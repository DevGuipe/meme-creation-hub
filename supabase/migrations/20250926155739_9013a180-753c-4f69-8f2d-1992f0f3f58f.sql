-- 4. Criar snapshot inicial para teste (semana atual como exemplo)
INSERT INTO leaderboard_snapshots (week_id, user_id, score, rank)
SELECT 
  '2025-W39-TEST' as week_id,
  user_id,
  weekly_score as score,
  weekly_rank as rank
FROM get_current_week_rankings()
WHERE weekly_score > 0;