-- Add unique constraint for upsert to work on users.telegram_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'users' 
      AND indexname = 'users_telegram_id_key'
  ) THEN
    ALTER TABLE public.users
    ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);
  END IF;
END $$;