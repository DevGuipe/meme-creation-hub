-- Fix get_user_rankings function completely to avoid all ambiguity

DROP FUNCTION IF EXISTS get_user_rankings();

CREATE OR REPLACE FUNCTION public.get_user_rankings()
RETURNS TABLE(
  user_id uuid, 
  telegram_id bigint, 
  first_name text, 
  total_score bigint, 
  weekly_score bigint, 
  global_rank bigint, 
  weekly_rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_scores AS (
    SELECT 
      u.id as user_uuid,
      u.telegram_id as user_telegram_id,
      u.first_name as user_first_name,
      COALESCE(SUM(pe.amount), 0) as user_total_score,
      COALESCE(SUM(CASE 
        WHEN pe.created_at >= date_trunc('week', CURRENT_DATE) 
        THEN pe.amount ELSE 0 
      END), 0) as user_weekly_score
    FROM users u
    LEFT JOIN popcat_events pe ON u.id = pe.user_id
    GROUP BY u.id, u.telegram_id, u.first_name
  ),
  global_rankings AS (
    SELECT 
      user_uuid as gr_user_uuid,
      user_total_score as gr_total_score,
      ROW_NUMBER() OVER (ORDER BY user_total_score DESC) as global_rank_num
    FROM user_scores
  ),
  weekly_rankings AS (
    SELECT 
      user_uuid as wr_user_uuid,
      user_weekly_score as wr_weekly_score,
      ROW_NUMBER() OVER (ORDER BY user_weekly_score DESC) as weekly_rank_num
    FROM user_scores
  )
  SELECT 
    us.user_uuid,
    us.user_telegram_id,
    us.user_first_name,
    us.user_total_score,
    us.user_weekly_score,
    gr.global_rank_num,
    wr.weekly_rank_num
  FROM user_scores us
  LEFT JOIN global_rankings gr ON us.user_uuid = gr.gr_user_uuid
  LEFT JOIN weekly_rankings wr ON us.user_uuid = wr.wr_user_uuid
  ORDER BY us.user_total_score DESC;
END;
$$;