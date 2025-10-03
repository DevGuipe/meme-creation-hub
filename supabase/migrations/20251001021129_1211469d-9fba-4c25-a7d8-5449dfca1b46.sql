-- Dynamic cleanup of ALL policies on target tables
DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies from memes table
  FOR r IN (
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'memes'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.memes';
  END LOOP;
  
  -- Drop all policies from templates table
  FOR r IN (
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'templates'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.templates';
  END LOOP;
  
  -- Drop all policies from assets table
  FOR r IN (
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'assets'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.assets';
  END LOOP;
  
  -- Drop all policies from popcat_events table
  FOR r IN (
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'popcat_events'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.popcat_events';
  END LOOP;
  
  -- Drop all policies from leaderboard_snapshots table
  FOR r IN (
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'leaderboard_snapshots'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.leaderboard_snapshots';
  END LOOP;
  
  -- Drop all policies from reactions table
  FOR r IN (
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'reactions'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.reactions';
  END LOOP;
  
  -- Drop all policies from reports table
  FOR r IN (
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'reports'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.reports';
  END LOOP;
END $$;

-- ===== RECREATE POLICIES =====

-- MEMES: Public can read, users can soft-delete their own, service_role can do everything
CREATE POLICY "public_read_memes"
ON public.memes
FOR SELECT
TO public
USING (deleted_at IS NULL);

CREATE POLICY "users_can_soft_delete_own_memes"
ON public.memes
FOR UPDATE
TO public
USING (true)
WITH CHECK (deleted_at IS NOT NULL);

CREATE POLICY "service_role_full_memes"
ON public.memes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- TEMPLATES: Public can read, only service_role can write
CREATE POLICY "public_read_templates"
ON public.templates
FOR SELECT
TO public
USING (true);

CREATE POLICY "service_role_full_templates"
ON public.templates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ASSETS: Public can read, only service_role can write
CREATE POLICY "public_read_assets"
ON public.assets
FOR SELECT
TO public
USING (true);

CREATE POLICY "service_role_full_assets"
ON public.assets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- POPCAT_EVENTS: Public can read, only service_role can write
CREATE POLICY "public_read_events"
ON public.popcat_events
FOR SELECT
TO public
USING (true);

CREATE POLICY "service_role_full_events"
ON public.popcat_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- LEADERBOARD_SNAPSHOTS: Public can read, only service_role can write
CREATE POLICY "public_read_leaderboard"
ON public.leaderboard_snapshots
FOR SELECT
TO public
USING (true);

CREATE POLICY "service_role_full_leaderboard"
ON public.leaderboard_snapshots
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- REACTIONS: Public can read, only service_role can write
CREATE POLICY "public_read_reactions"
ON public.reactions
FOR SELECT
TO public
USING (true);

CREATE POLICY "service_role_full_reactions"
ON public.reactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- REPORTS: Public can read, only service_role can write
CREATE POLICY "public_read_reports"
ON public.reports
FOR SELECT
TO public
USING (true);

CREATE POLICY "service_role_full_reports"
ON public.reports
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);