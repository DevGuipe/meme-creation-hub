-- Fix ranking functions with ambiguous column references

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_user_rankings();
DROP FUNCTION IF EXISTS get_current_week_rankings();

-- Recreate get_user_rankings with fixed column references
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
      COALESCE(SUM(pe.amount), 0) as total_score,
      COALESCE(SUM(CASE 
        WHEN pe.created_at >= date_trunc('week', CURRENT_DATE) 
        THEN pe.amount ELSE 0 
      END), 0) as weekly_score
    FROM users u
    LEFT JOIN popcat_events pe ON u.id = pe.user_id
    GROUP BY u.id, u.telegram_id, u.first_name
  ),
  global_rankings AS (
    SELECT 
      user_uuid,
      total_score,
      ROW_NUMBER() OVER (ORDER BY total_score DESC) as global_rank
    FROM user_scores
  ),
  weekly_rankings AS (
    SELECT 
      user_uuid,
      weekly_score,
      ROW_NUMBER() OVER (ORDER BY weekly_score DESC) as weekly_rank
    FROM user_scores
  )
  SELECT 
    us.user_uuid,
    us.user_telegram_id,
    us.user_first_name,
    us.total_score,
    us.weekly_score,
    gr.global_rank,
    wr.weekly_rank
  FROM user_scores us
  LEFT JOIN global_rankings gr ON us.user_uuid = gr.user_uuid
  LEFT JOIN weekly_rankings wr ON us.user_uuid = wr.user_uuid
  ORDER BY us.total_score DESC;
END;
$$;

-- Recreate get_current_week_rankings with fixed column references
CREATE OR REPLACE FUNCTION public.get_current_week_rankings()
RETURNS TABLE(
  user_id uuid, 
  telegram_id bigint, 
  first_name text, 
  weekly_score bigint, 
  weekly_rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH weekly_scores AS (
    SELECT 
      u.id as user_uuid,
      u.telegram_id as user_telegram_id,
      u.first_name as user_first_name,
      COALESCE(SUM(pe.amount), 0) as weekly_score
    FROM users u
    LEFT JOIN popcat_events pe ON u.id = pe.user_id
    WHERE pe.created_at >= date_trunc('week', CURRENT_DATE)
    GROUP BY u.id, u.telegram_id, u.first_name
    HAVING COALESCE(SUM(pe.amount), 0) > 0
  )
  SELECT 
    ws.user_uuid,
    ws.user_telegram_id,
    ws.user_first_name,
    ws.weekly_score,
    ROW_NUMBER() OVER (ORDER BY ws.weekly_score DESC) as weekly_rank
  FROM weekly_scores ws
  ORDER BY ws.weekly_score DESC;
END;
$$;