-- Create function to get weekly rankings for a specific period
CREATE OR REPLACE FUNCTION public.get_weekly_rankings_for_period(
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
RETURNS TABLE(
  user_id uuid,
  telegram_id bigint,
  first_name text,
  weekly_score integer,
  weekly_rank integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH weekly_scores AS (
    SELECT 
      u.id as user_id,
      u.telegram_id,
      u.first_name,
      COALESCE(SUM(te.amount), 0)::integer as weekly_score
    FROM users u
    LEFT JOIN testo_events te ON u.id = te.user_id 
      AND te.created_at >= start_date 
      AND te.created_at <= end_date
    GROUP BY u.id, u.telegram_id, u.first_name
  ),
  ranked_scores AS (
    SELECT 
      ws.user_id,
      ws.telegram_id,
      ws.first_name,
      ws.weekly_score,
      ROW_NUMBER() OVER (ORDER BY ws.weekly_score DESC, ws.user_id) as weekly_rank
    FROM weekly_scores ws
    WHERE ws.weekly_score > 0
  )
  SELECT 
    rs.user_id,
    rs.telegram_id,
    rs.first_name,
    rs.weekly_score,
    rs.weekly_rank::integer
  FROM ranked_scores rs
  ORDER BY rs.weekly_rank;
END;
$$;