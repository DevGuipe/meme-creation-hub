-- Add idempotency_key column and unique index
ALTER TABLE public.memes
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS memes_idempotency_key_uidx
  ON public.memes (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Ensure storage bucket 'memes' exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('memes', 'memes', true)
ON CONFLICT (id) DO NOTHING;