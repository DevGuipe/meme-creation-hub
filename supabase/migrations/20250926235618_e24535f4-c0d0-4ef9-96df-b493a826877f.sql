-- Corrigir com valores válidos do enum popcat_source

-- 1. Adicionar dados de teste usando apenas valores válidos do enum
INSERT INTO popcat_events (user_id, source, amount, created_at) VALUES 
-- Usuário existente - eventos desta semana
('870314eb-2cf6-4a55-a53b-fd9483120ef4', 'save_meme', 50, NOW()),
('870314eb-2cf6-4a55-a53b-fd9483120ef4', 'save_meme', 10, NOW() - INTERVAL '1 day'),
('870314eb-2cf6-4a55-a53b-fd9483120ef4', 'reaction_popcat', 5, NOW() - INTERVAL '2 days'),
-- Eventos da semana passada  
('870314eb-2cf6-4a55-a53b-fd9483120ef4', 'save_meme', 30, NOW() - INTERVAL '8 days'),
('870314eb-2cf6-4a55-a53b-fd9483120ef4', 'reaction_popcat', 15, NOW() - INTERVAL '10 days');

-- 2. Recriar get_current_week_rankings com lógica corrigida
DROP FUNCTION IF EXISTS get_current_week_rankings();

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
      COALESCE(SUM(pe.amount), 0) as user_weekly_score
    FROM users u
    LEFT JOIN popcat_events pe ON u.id = pe.user_id
      AND pe.created_at >= date_trunc('week', CURRENT_DATE)
      AND pe.created_at < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'
    GROUP BY u.id, u.telegram_id, u.first_name
    HAVING COALESCE(SUM(pe.amount), 0) > 0
  )
  SELECT 
    ws.user_uuid,
    ws.user_telegram_id,
    ws.user_first_name,
    ws.user_weekly_score,
    ROW_NUMBER() OVER (ORDER BY ws.user_weekly_score DESC) as weekly_rank
  FROM weekly_scores ws
  ORDER BY ws.user_weekly_score DESC;
END;
$$;

-- 3. Recriar get_user_ranking com lógica mais robusta  
DROP FUNCTION IF EXISTS get_user_ranking(bigint);

CREATE OR REPLACE FUNCTION public.get_user_ranking(user_telegram_id bigint)
RETURNS TABLE(
  user_id uuid, 
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
  WITH target_user AS (
    SELECT u.id as target_user_id
    FROM users u
    WHERE u.telegram_id = user_telegram_id
  ),
  user_scores AS (
    SELECT 
      tu.target_user_id,
      COALESCE(SUM(pe.amount), 0) as total_score,
      COALESCE(SUM(CASE 
        WHEN pe.created_at >= date_trunc('week', CURRENT_DATE) 
          AND pe.created_at < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'
        THEN pe.amount ELSE 0 
      END), 0) as weekly_score
    FROM target_user tu
    LEFT JOIN popcat_events pe ON tu.target_user_id = pe.user_id
    GROUP BY tu.target_user_id
  ),
  global_rankings AS (
    SELECT 
      u.id as gr_user_id,
      COALESCE(SUM(pe.amount), 0) as gr_total_score,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pe.amount), 0) DESC) as global_rank
    FROM users u
    LEFT JOIN popcat_events pe ON u.id = pe.user_id
    GROUP BY u.id
  ),
  weekly_rankings AS (
    SELECT 
      u.id as wr_user_id,
      COALESCE(SUM(pe.amount), 0) as wr_weekly_score,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pe.amount), 0) DESC) as weekly_rank
    FROM users u
    LEFT JOIN popcat_events pe ON u.id = pe.user_id
    WHERE pe.created_at >= date_trunc('week', CURRENT_DATE)
      AND pe.created_at < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'
    GROUP BY u.id
    HAVING COALESCE(SUM(pe.amount), 0) > 0
  )
  SELECT 
    us.target_user_id,
    us.total_score,
    us.weekly_score,
    COALESCE(gr.global_rank, 999999) as global_rank,
    COALESCE(wr.weekly_rank, 999999) as weekly_rank
  FROM user_scores us
  LEFT JOIN global_rankings gr ON us.target_user_id = gr.gr_user_id
  LEFT JOIN weekly_rankings wr ON us.target_user_id = wr.wr_user_id;
END;
$$;