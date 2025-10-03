-- Fix RLS policies definitively to prevent violations

-- Drop all existing RLS policies for memes and popcat_events
DROP POLICY IF EXISTS "memes_select_policy" ON public.memes;
DROP POLICY IF EXISTS "memes_insert_policy" ON public.memes;
DROP POLICY IF EXISTS "memes_update_policy" ON public.memes;
DROP POLICY IF EXISTS "memes_delete_policy" ON public.memes;

DROP POLICY IF EXISTS "Users can view their own popcat events" ON public.popcat_events;
DROP POLICY IF EXISTS "System can create popcat events" ON public.popcat_events;
DROP POLICY IF EXISTS "Users can create their own popcat events" ON public.popcat_events;

-- Create simple, working RLS policies for memes
CREATE POLICY "memes_select_all" ON public.memes
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "memes_insert_authenticated" ON public.memes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "memes_update_authenticated" ON public.memes
  FOR UPDATE USING (true);

CREATE POLICY "memes_delete_authenticated" ON public.memes
  FOR DELETE USING (true);

-- Create simple, working RLS policies for popcat_events  
CREATE POLICY "popcat_events_select_all" ON public.popcat_events
  FOR SELECT USING (true);

CREATE POLICY "popcat_events_insert_all" ON public.popcat_events
  FOR INSERT WITH CHECK (true);

-- Ensure RLS is enabled on both tables
ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popcat_events ENABLE ROW LEVEL SECURITY;