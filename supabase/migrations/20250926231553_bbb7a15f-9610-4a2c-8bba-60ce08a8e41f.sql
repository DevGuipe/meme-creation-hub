-- Drop existing functions first
DROP FUNCTION IF EXISTS get_user_ranking(bigint);
DROP FUNCTION IF EXISTS get_user_rankings();
DROP FUNCTION IF EXISTS get_current_week_rankings();

-- Rename testo_events table to popcat_events
ALTER TABLE testo_events RENAME TO popcat_events;

-- Update all RPC functions to use new table name
CREATE OR REPLACE FUNCTION get_user_ranking(user_telegram_id bigint)
RETURNS TABLE (
  user_id uuid,
  total_score bigint,
  weekly_score bigint,
  global_rank bigint,
  weekly_rank bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_scores AS (
    SELECT 
      u.id as user_id,
      COALESCE(SUM(pe.amount), 0) as total_score,
      COALESCE(SUM(CASE 
        WHEN pe.created_at >= date_trunc('week', CURRENT_DATE) 
        THEN pe.amount ELSE 0 
      END), 0) as weekly_score
    FROM users u
    LEFT JOIN popcat_events pe ON u.id = pe.user_id
    WHERE u.telegram_id = user_telegram_id
    GROUP BY u.id
  ),
  global_rankings AS (
    SELECT 
      u.id as user_id,
      COALESCE(SUM(pe.amount), 0) as total_score,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pe.amount), 0) DESC) as global_rank
    FROM users u
    LEFT JOIN popcat_events pe ON u.id = pe.user_id
    GROUP BY u.id
  ),
  weekly_rankings AS (
    SELECT 
      u.id as user_id,
      COALESCE(SUM(pe.amount), 0) as weekly_score,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pe.amount), 0) DESC) as weekly_rank
    FROM users u
    LEFT JOIN popcat_events pe ON u.id = pe.user_id
    WHERE pe.created_at >= date_trunc('week', CURRENT_DATE)
    GROUP BY u.id
  )
  SELECT 
    us.user_id,
    us.total_score,
    us.weekly_score,
    gr.global_rank,
    COALESCE(wr.weekly_rank, 999999) as weekly_rank
  FROM user_scores us
  LEFT JOIN global_rankings gr ON us.user_id = gr.user_id
  LEFT JOIN weekly_rankings wr ON us.user_id = wr.user_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_rankings()
RETURNS TABLE (
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
AS $$
BEGIN
  RETURN QUERY
  WITH user_scores AS (
    SELECT 
      u.id as user_id,
      u.telegram_id,
      u.first_name,
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
      user_id,
      total_score,
      ROW_NUMBER() OVER (ORDER BY total_score DESC) as global_rank
    FROM user_scores
  ),
  weekly_rankings AS (
    SELECT 
      user_id,
      weekly_score,
      ROW_NUMBER() OVER (ORDER BY weekly_score DESC) as weekly_rank
    FROM user_scores
  )
  SELECT 
    us.user_id,
    us.telegram_id,
    us.first_name,
    us.total_score,
    us.weekly_score,
    gr.global_rank,
    wr.weekly_rank
  FROM user_scores us
  LEFT JOIN global_rankings gr ON us.user_id = gr.user_id
  LEFT JOIN weekly_rankings wr ON us.user_id = wr.user_id
  ORDER BY us.total_score DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_current_week_rankings()
RETURNS TABLE (
  user_id uuid,
  telegram_id bigint,
  first_name text,
  weekly_score bigint,
  weekly_rank bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH weekly_scores AS (
    SELECT 
      u.id as user_id,
      u.telegram_id,
      u.first_name,
      COALESCE(SUM(pe.amount), 0) as weekly_score
    FROM users u
    LEFT JOIN popcat_events pe ON u.id = pe.user_id
    WHERE pe.created_at >= date_trunc('week', CURRENT_DATE)
    GROUP BY u.id, u.telegram_id, u.first_name
    HAVING COALESCE(SUM(pe.amount), 0) > 0
  )
  SELECT 
    ws.user_id,
    ws.telegram_id,
    ws.first_name,
    ws.weekly_score,
    ROW_NUMBER() OVER (ORDER BY ws.weekly_score DESC) as weekly_rank
  FROM weekly_scores ws
  ORDER BY ws.weekly_score DESC;
END;
$$;