-- 2. Criar indexes para performance (sem predicados com funções não-imutáveis)
CREATE INDEX IF NOT EXISTS idx_testo_events_user_created_at 
ON testo_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_testo_events_created_at 
ON testo_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_week 
ON leaderboard_snapshots(week_id, rank);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id 
ON users(telegram_id);