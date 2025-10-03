-- Create function to calculate user rankings
CREATE OR REPLACE FUNCTION public.get_user_rankings()
RETURNS TABLE(
  user_id uuid,
  telegram_id bigint,
  first_name text,
  total_score integer,
  weekly_score integer,
  global_rank integer,
  weekly_rank integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      *,
      ROW_NUMBER() OVER (ORDER BY total_score DESC, user_id) as global_rank,
      ROW_NUMBER() OVER (ORDER BY weekly_score DESC, user_id) as weekly_rank
    FROM user_scores
  )
  SELECT * FROM ranked_users;
END;
$$;

-- Create function to get specific user's ranking
CREATE OR REPLACE FUNCTION public.get_user_ranking(user_telegram_id bigint)
RETURNS TABLE(
  total_score integer,
  weekly_score integer,
  global_rank integer,
  weekly_rank integer,
  total_users integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH rankings AS (
    SELECT * FROM get_user_rankings()
  )
  SELECT 
    r.total_score,
    r.weekly_score,
    r.global_rank,
    r.weekly_rank,
    (SELECT COUNT(*)::integer FROM rankings) as total_users
  FROM rankings r
  WHERE r.telegram_id = user_telegram_id;
END;
$$;