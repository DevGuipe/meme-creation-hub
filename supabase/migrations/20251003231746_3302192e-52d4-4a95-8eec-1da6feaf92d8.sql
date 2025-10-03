-- Fix: Add reactions table for Telegram bot reactions
-- This table tracks user reactions to memes to prevent duplicates

CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meme_id UUID NOT NULL,
  reactor_telegram_id BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('thumbs_up', 'laugh', 'flex', 'popcat', 'moai')),
  message_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(meme_id, reactor_telegram_id, type)
);

-- Enable RLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can read reactions
CREATE POLICY "Reactions are viewable by everyone"
ON public.reactions
FOR SELECT
USING (true);

-- RLS Policy: Only service role can insert (via edge functions)
CREATE POLICY "Service role can insert reactions"
ON public.reactions
FOR INSERT
WITH CHECK (false);

-- Add index for faster duplicate checks
CREATE INDEX IF NOT EXISTS idx_reactions_meme_reactor 
ON public.reactions(meme_id, reactor_telegram_id, type);

-- Fix: Add meme_id column to popcat_events for better tracking
ALTER TABLE public.popcat_events
ADD COLUMN IF NOT EXISTS meme_id UUID;

-- Add index for meme_id lookups
CREATE INDEX IF NOT EXISTS idx_popcat_events_meme_id
ON public.popcat_events(meme_id);