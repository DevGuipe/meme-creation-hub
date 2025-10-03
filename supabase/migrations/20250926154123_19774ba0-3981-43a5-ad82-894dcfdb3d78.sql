-- Create function to get current week rankings (Monday to Sunday)
CREATE OR REPLACE FUNCTION public.get_current_week_rankings()
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
DECLARE
  week_start timestamp with time zone;
  week_end timestamp with time zone;
BEGIN
  -- Calculate current week (Monday to Sunday)
  week_start := DATE_TRUNC('week', NOW()) + INTERVAL '1 day'; -- Monday
  week_end := week_start + INTERVAL '6 days' + INTERVAL '23 hours 59 minutes 59 seconds'; -- Sunday end
  
  RETURN QUERY
  SELECT * FROM get_weekly_rankings_for_period(week_start, week_end);
END;
$$;