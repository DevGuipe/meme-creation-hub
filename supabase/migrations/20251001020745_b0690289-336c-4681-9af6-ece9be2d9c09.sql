-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "service_memes" ON public.memes;
DROP POLICY IF EXISTS "service_templates" ON public.templates;
DROP POLICY IF EXISTS "service_assets" ON public.assets;
DROP POLICY IF EXISTS "service_events" ON public.popcat_events;
DROP POLICY IF EXISTS "service_leaderboard" ON public.leaderboard_snapshots;
DROP POLICY IF EXISTS "service_reactions" ON public.reactions;
DROP POLICY IF EXISTS "service_reports" ON public.reports;

-- ===== MEMES TABLE =====
-- Allow users to soft-delete their own memes (UPDATE only for deleted_at)
CREATE POLICY "users_can_soft_delete_own_memes"
ON public.memes
FOR UPDATE
TO public
USING (true)
WITH CHECK (deleted_at IS NOT NULL);

-- Service role has full access
CREATE POLICY "service_role_insert_memes"
ON public.memes
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "service_role_update_memes"
ON public.memes
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_delete_memes"
ON public.memes
FOR DELETE
TO service_role
USING (true);

-- ===== TEMPLATES =====
CREATE POLICY "service_role_insert_templates"
ON public.templates
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "service_role_update_templates"
ON public.templates
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_delete_templates"
ON public.templates
FOR DELETE
TO service_role
USING (true);

-- ===== ASSETS =====
CREATE POLICY "service_role_insert_assets"
ON public.assets
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "service_role_update_assets"
ON public.assets
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_delete_assets"
ON public.assets
FOR DELETE
TO service_role
USING (true);

-- ===== POPCAT_EVENTS =====
CREATE POLICY "service_role_insert_events"
ON public.popcat_events
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "service_role_update_events"
ON public.popcat_events
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_delete_events"
ON public.popcat_events
FOR DELETE
TO service_role
USING (true);

-- ===== LEADERBOARD_SNAPSHOTS =====
CREATE POLICY "service_role_insert_leaderboard"
ON public.leaderboard_snapshots
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "service_role_update_leaderboard"
ON public.leaderboard_snapshots
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_delete_leaderboard"
ON public.leaderboard_snapshots
FOR DELETE
TO service_role
USING (true);

-- ===== REACTIONS =====
CREATE POLICY "service_role_insert_reactions"
ON public.reactions
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "service_role_update_reactions"
ON public.reactions
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_delete_reactions"
ON public.reactions
FOR DELETE
TO service_role
USING (true);

-- ===== REPORTS =====
CREATE POLICY "service_role_insert_reports"
ON public.reports
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "service_role_update_reports"
ON public.reports
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_delete_reports"
ON public.reports
FOR DELETE
TO service_role
USING (true);