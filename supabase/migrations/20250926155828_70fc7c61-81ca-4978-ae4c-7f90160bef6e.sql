-- 5. Criar alguns eventos de teste para weekly_winner
INSERT INTO testo_events (user_id, source, amount)
SELECT 
  user_id,
  'weekly_winner'::testo_source,
  CASE 
    WHEN weekly_rank = 1 THEN 10
    WHEN weekly_rank = 2 THEN 6  
    WHEN weekly_rank = 3 THEN 3
    ELSE 0
  END as amount
FROM get_current_week_rankings()
WHERE weekly_rank <= 3 AND weekly_score > 0;