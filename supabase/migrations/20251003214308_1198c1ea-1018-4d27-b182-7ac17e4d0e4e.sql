-- Create popcat_events table for tracking user activities and scores
CREATE TABLE IF NOT EXISTS public.popcat_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (char_length(source) > 0),
  amount INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_popcat_events_user_id ON public.popcat_events(user_id);
CREATE INDEX IF NOT EXISTS idx_popcat_events_created_at ON public.popcat_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_popcat_events_source ON public.popcat_events(source);

-- Enable RLS
ALTER TABLE public.popcat_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for popcat_events
CREATE POLICY "Users can view their own events"
  ON public.popcat_events
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own events via functions only"
  ON public.popcat_events
  FOR INSERT
  WITH CHECK (false);

-- Function to get user ranking with scores
CREATE OR REPLACE FUNCTION public.get_user_ranking(user_telegram_id BIGINT)
RETURNS TABLE (
  user_id UUID,
  telegram_id BIGINT,
  first_name TEXT,
  total_score BIGINT,
  weekly_score BIGINT,
  global_rank BIGINT,
  weekly_rank BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    WHERE u.telegram_id = user_telegram_id
    GROUP BY u.id, u.telegram_id, u.first_name
  ),
  global_ranks AS (
    SELECT 
      u.id,
      COALESCE(SUM(pe.amount), 0) as score,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pe.amount), 0) DESC) as rank
    FROM public.users u
    LEFT JOIN public.popcat_events pe ON u.id = pe.user_id
    GROUP BY u.id
  ),
  weekly_ranks AS (
    SELECT 
      u.id,
      COALESCE(SUM(pe.amount), 0) as score,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pe.amount), 0) DESC) as rank
    FROM public.users u
    LEFT JOIN public.popcat_events pe ON u.id = pe.user_id 
      AND pe.created_at >= date_trunc('week', now())
    GROUP BY u.id
  )
  SELECT 
    us.id,
    us.telegram_id,
    us.first_name,
    us.total_score,
    us.weekly_score,
    gr.rank as global_rank,
    wr.rank as weekly_rank
  FROM user_scores us
  LEFT JOIN global_ranks gr ON us.id = gr.id
  LEFT JOIN weekly_ranks wr ON us.id = wr.id;
END;
$$;

-- Function to get top user rankings (leaderboard)
CREATE OR REPLACE FUNCTION public.get_user_rankings()
RETURNS TABLE (
  user_id UUID,
  telegram_id BIGINT,
  first_name TEXT,
  total_score BIGINT,
  weekly_score BIGINT,
  global_rank BIGINT,
  weekly_rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      *,
      ROW_NUMBER() OVER (ORDER BY total_score DESC) as global_rank,
      ROW_NUMBER() OVER (ORDER BY weekly_score DESC) as weekly_rank
    FROM user_scores
  )
  SELECT 
    id as user_id,
    telegram_id,
    first_name,
    total_score,
    weekly_score,
    global_rank,
    weekly_rank
  FROM ranked_users
  ORDER BY total_score DESC;
END;
$$;