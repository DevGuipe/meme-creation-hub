-- Drop ALL existing policies (including partial ones from previous migration)
DROP POLICY IF EXISTS "service_memes" ON public.memes;
DROP POLICY IF EXISTS "users_can_soft_delete_own_memes" ON public.memes;
DROP POLICY IF EXISTS "service_role_insert_memes" ON public.memes;
DROP POLICY IF EXISTS "service_role_update_memes" ON public.memes;
DROP POLICY IF EXISTS "service_role_delete_memes" ON public.memes;
DROP POLICY IF EXISTS "service_role_full_memes" ON public.memes;

DROP POLICY IF EXISTS "service_templates" ON public.templates;
DROP POLICY IF EXISTS "service_role_write_templates" ON public.templates;
DROP POLICY IF EXISTS "service_role_insert_templates" ON public.templates;
DROP POLICY IF EXISTS "service_role_update_templates" ON public.templates;
DROP POLICY IF EXISTS "service_role_delete_templates" ON public.templates;

DROP POLICY IF EXISTS "service_assets" ON public.assets;
DROP POLICY IF EXISTS "service_role_write_assets" ON public.assets;
DROP POLICY IF EXISTS "service_role_insert_assets" ON public.assets;
DROP POLICY IF EXISTS "service_role_update_assets" ON public.assets;
DROP POLICY IF EXISTS "service_role_delete_assets" ON public.assets;

DROP POLICY IF EXISTS "service_events" ON public.popcat_events;
DROP POLICY IF EXISTS "service_role_write_events" ON public.popcat_events;
DROP POLICY IF EXISTS "service_role_insert_events" ON public.popcat_events;
DROP POLICY IF EXISTS "service_role_update_events" ON public.popcat_events;
DROP POLICY IF EXISTS "service_role_delete_events" ON public.popcat_events;

DROP POLICY IF EXISTS "service_leaderboard" ON public.leaderboard_snapshots;
DROP POLICY IF EXISTS "service_role_write_leaderboard" ON public.leaderboard_snapshots;
DROP POLICY IF EXISTS "service_role_insert_leaderboard" ON public.leaderboard_snapshots;
DROP POLICY IF EXISTS "service_role_update_leaderboard" ON public.leaderboard_snapshots;
DROP POLICY IF EXISTS "service_role_delete_leaderboard" ON public.leaderboard_snapshots;

DROP POLICY IF EXISTS "service_reactions" ON public.reactions;
DROP POLICY IF EXISTS "service_role_write_reactions" ON public.reactions;
DROP POLICY IF EXISTS "service_role_insert_reactions" ON public.reactions;
DROP POLICY IF EXISTS "service_role_update_reactions" ON public.reactions;
DROP POLICY IF EXISTS "service_role_delete_reactions" ON public.reactions;

DROP POLICY IF EXISTS "service_reports" ON public.reports;
DROP POLICY IF EXISTS "service_role_write_reports" ON public.reports;
DROP POLICY IF EXISTS "service_role_insert_reports" ON public.reports;
DROP POLICY IF EXISTS "service_role_update_reports" ON public.reports;
DROP POLICY IF EXISTS "service_role_delete_reports" ON public.reports;

-- ===== RECREATE POLICIES =====

-- MEMES: Users can soft-delete their own, service_role can do everything
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

-- TEMPLATES: Only service_role can write
CREATE POLICY "service_role_full_templates"
ON public.templates
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ASSETS: Only service_role can write
CREATE POLICY "service_role_full_assets"
ON public.assets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- POPCAT_EVENTS: Only service_role can write
CREATE POLICY "service_role_full_events"
ON public.popcat_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- LEADERBOARD_SNAPSHOTS: Only service_role can write
CREATE POLICY "service_role_full_leaderboard"
ON public.leaderboard_snapshots
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- REACTIONS: Only service_role can write
CREATE POLICY "service_role_full_reactions"
ON public.reactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- REPORTS: Only service_role can write
CREATE POLICY "service_role_full_reports"
ON public.reports
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);