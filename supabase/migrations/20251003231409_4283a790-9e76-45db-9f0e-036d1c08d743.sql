-- Fix: get_user_rankings function - resolve "total_score" ambiguity
-- The issue was in the ORDER BY clause where total_score was ambiguous
-- between the RETURNS TABLE parameter and the CTE column

DROP FUNCTION IF EXISTS public.get_user_rankings();

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
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH user_scores AS (
    SELECT 
      u.id,
      u.telegram_id,
      u.first_name,
      COALESCE(SUM(pe.amount), 0) as total_score,
      COALESCE(SUM(CASE 
        WHEN pe.created_at >= date_trunc('week', now()) 
        THEN pe.amount 
        ELSE 0 
      END), 0) as weekly_score
    FROM public.users u
    LEFT JOIN public.popcat_events pe ON u.id = pe.user_id
    GROUP BY u.id, u.telegram_id, u.first_name
  ),
  ranked_users AS (
    SELECT 
      user_scores.id,
      user_scores.telegram_id,
      user_scores.first_name,
      user_scores.total_score,
      user_scores.weekly_score,
      ROW_NUMBER() OVER (ORDER BY user_scores.total_score DESC) as global_rank,
      ROW_NUMBER() OVER (ORDER BY user_scores.weekly_score DESC) as weekly_rank
    FROM user_scores
  )
  SELECT 
    ranked_users.id as user_id,
    ranked_users.telegram_id,
    ranked_users.first_name,
    ranked_users.total_score,
    ranked_users.weekly_score,
    ranked_users.global_rank,
    ranked_users.weekly_rank
  FROM ranked_users
  ORDER BY ranked_users.total_score DESC;
END;
$function$;