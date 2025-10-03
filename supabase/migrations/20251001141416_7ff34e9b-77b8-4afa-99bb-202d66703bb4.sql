-- Add idempotency support to memes saving
ALTER TABLE public.memes
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Ensure deduplication per user: same idempotency_key cannot be inserted twice
CREATE UNIQUE INDEX IF NOT EXISTS uq_memes_owner_id_idem
ON public.memes (owner_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;