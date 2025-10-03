-- Fix ambiguous column reference in get_user_rankings function
CREATE OR REPLACE FUNCTION public.get_user_rankings()
RETURNS TABLE(user_id uuid, telegram_id bigint, first_name text, total_score integer, weekly_score integer, global_rank integer, weekly_rank integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH user_scores AS (
    SELECT 
      u.id as user_id,
      u.telegram_id,
      u.first_name,
      COALESCE(SUM(te.amount), 0)::integer as total_score,
      COALESCE(SUM(CASE 
        WHEN te.created_at >= NOW() - INTERVAL '7 days' 
        THEN te.amount 
        ELSE 0 
      END), 0)::integer as weekly_score
    FROM users u
    LEFT JOIN testo_events te ON u.id = te.user_id
    GROUP BY u.id, u.telegram_id, u.first_name
  ),
  ranked_users AS (
    SELECT 
      us.user_id,
      us.telegram_id,
      us.first_name,
      us.total_score,
      us.weekly_score,
      ROW_NUMBER() OVER (ORDER BY us.total_score DESC, us.user_id) as global_rank,
      ROW_NUMBER() OVER (ORDER BY us.weekly_score DESC, us.user_id) as weekly_rank
    FROM user_scores us
  )
  SELECT 
    ru.user_id,
    ru.telegram_id,
    ru.first_name,
    ru.total_score,
    ru.weekly_score,
    ru.global_rank::integer,
    ru.weekly_rank::integer
  FROM ranked_users ru;
END;
$$;