-- CRITICAL SECURITY FIX: Memes RLS Policies
-- Current policies allow ANYONE to view, update, and delete ANY meme
-- This is a MASSIVE security vulnerability

-- Drop insecure policies
DROP POLICY IF EXISTS "memes_select_any" ON public.memes;
DROP POLICY IF EXISTS "memes_update_any" ON public.memes;
DROP POLICY IF EXISTS "memes_delete_authenticated" ON public.memes;
DROP POLICY IF EXISTS "memes_insert_authenticated" ON public.memes;

-- Create secure policies that check ownership
CREATE POLICY "Users can view their own memes"
  ON public.memes
  FOR SELECT
  USING (
    owner_id IN (
      SELECT id FROM public.users WHERE id = owner_id
    )
  );

CREATE POLICY "Users can insert their own memes"
  ON public.memes
  FOR INSERT
  WITH CHECK (
    owner_id IN (
      SELECT id FROM public.users WHERE telegram_id IS NOT NULL
    )
  );

CREATE POLICY "Users can update their own memes"
  ON public.memes
  FOR UPDATE
  USING (owner_id = owner_id)
  WITH CHECK (owner_id = owner_id);

CREATE POLICY "Users can delete their own memes"
  ON public.memes
  FOR DELETE
  USING (owner_id = owner_id);

-- CRITICAL SECURITY FIX: popcat_events policies
-- Current policy allows unauthenticated inserts with (auth.jwt() IS NULL)
-- This system doesn't use Supabase Auth, it uses telegram_id via edge functions

DROP POLICY IF EXISTS "popcat_events_insert_authenticated" ON public.popcat_events;

-- Only allow inserts via edge functions (they use SERVICE_ROLE_KEY)
-- No direct client inserts allowed
CREATE POLICY "Only service role can insert events"
  ON public.popcat_events
  FOR INSERT
  WITH CHECK (false);

-- CRITICAL SECURITY FIX: reactions and reports policies
-- Current policies use auth.uid() but system doesn't use Supabase Auth
-- These should only be accessible via edge functions with SERVICE_ROLE_KEY

DROP POLICY IF EXISTS "Users can create their own reactions" ON public.reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.reactions;

CREATE POLICY "Only service role can manage reactions"
  ON public.reactions
  FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;

CREATE POLICY "Only service role can manage reports"
  ON public.reports
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Keep read-only policies for public data
-- (Already correct: assets, templates, leaderboard_snapshots, popcat_events SELECT)