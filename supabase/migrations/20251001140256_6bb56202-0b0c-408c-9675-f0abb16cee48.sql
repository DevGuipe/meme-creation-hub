-- ============================================
-- AFROUXAR POLÍTICAS RLS - VERSÃO CORRIGIDA
-- Dropar todas as versões de políticas existentes
-- ============================================

-- DROP todas as versões de políticas (antigas e novas)
DROP POLICY IF EXISTS "public_read_assets" ON public.assets;
DROP POLICY IF EXISTS "service_role_full_assets" ON public.assets;
DROP POLICY IF EXISTS "allow_public_read_assets" ON public.assets;
DROP POLICY IF EXISTS "allow_service_all_assets" ON public.assets;

DROP POLICY IF EXISTS "public_read_leaderboard" ON public.leaderboard_snapshots;
DROP POLICY IF EXISTS "service_role_full_leaderboard" ON public.leaderboard_snapshots;
DROP POLICY IF EXISTS "allow_public_read_leaderboard" ON public.leaderboard_snapshots;
DROP POLICY IF EXISTS "allow_service_all_leaderboard" ON public.leaderboard_snapshots;

DROP POLICY IF EXISTS "public_read_memes" ON public.memes;
DROP POLICY IF EXISTS "service_role_full_memes" ON public.memes;
DROP POLICY IF EXISTS "allow_public_read_memes" ON public.memes;
DROP POLICY IF EXISTS "allow_service_all_memes" ON public.memes;

DROP POLICY IF EXISTS "public_read_events" ON public.popcat_events;
DROP POLICY IF EXISTS "service_role_full_events" ON public.popcat_events;
DROP POLICY IF EXISTS "allow_public_read_events" ON public.popcat_events;
DROP POLICY IF EXISTS "allow_service_all_events" ON public.popcat_events;

DROP POLICY IF EXISTS "public_read_reactions" ON public.reactions;
DROP POLICY IF EXISTS "service_role_full_reactions" ON public.reactions;
DROP POLICY IF EXISTS "allow_public_read_reactions" ON public.reactions;
DROP POLICY IF EXISTS "allow_service_all_reactions" ON public.reactions;

DROP POLICY IF EXISTS "public_read_reports" ON public.reports;
DROP POLICY IF EXISTS "service_role_full_reports" ON public.reports;
DROP POLICY IF EXISTS "allow_public_read_reports" ON public.reports;
DROP POLICY IF EXISTS "allow_service_all_reports" ON public.reports;

DROP POLICY IF EXISTS "public_read_templates" ON public.templates;
DROP POLICY IF EXISTS "service_role_full_templates" ON public.templates;
DROP POLICY IF EXISTS "allow_public_read_templates" ON public.templates;
DROP POLICY IF EXISTS "allow_service_all_templates" ON public.templates;

DROP POLICY IF EXISTS "service_role_full_users" ON public.users;
DROP POLICY IF EXISTS "allow_service_all_users" ON public.users;

-- CRIAR políticas permissivas
-- ASSETS
CREATE POLICY "permissive_read_assets" ON public.assets
  FOR SELECT USING (true);

CREATE POLICY "permissive_all_assets" ON public.assets
  FOR ALL USING (true) WITH CHECK (true);

-- LEADERBOARD
CREATE POLICY "permissive_read_leaderboard" ON public.leaderboard_snapshots
  FOR SELECT USING (true);

CREATE POLICY "permissive_all_leaderboard" ON public.leaderboard_snapshots
  FOR ALL USING (true) WITH CHECK (true);

-- MEMES
CREATE POLICY "permissive_read_memes" ON public.memes
  FOR SELECT USING (true);

CREATE POLICY "permissive_all_memes" ON public.memes
  FOR ALL USING (true) WITH CHECK (true);

-- POPCAT_EVENTS
CREATE POLICY "permissive_read_events" ON public.popcat_events
  FOR SELECT USING (true);

CREATE POLICY "permissive_all_events" ON public.popcat_events
  FOR ALL USING (true) WITH CHECK (true);

-- REACTIONS
CREATE POLICY "permissive_read_reactions" ON public.reactions
  FOR SELECT USING (true);

CREATE POLICY "permissive_all_reactions" ON public.reactions
  FOR ALL USING (true) WITH CHECK (true);

-- REPORTS
CREATE POLICY "permissive_read_reports" ON public.reports
  FOR SELECT USING (true);

CREATE POLICY "permissive_all_reports" ON public.reports
  FOR ALL USING (true) WITH CHECK (true);

-- TEMPLATES
CREATE POLICY "permissive_read_templates" ON public.templates
  FOR SELECT USING (true);

CREATE POLICY "permissive_all_templates" ON public.templates
  FOR ALL USING (true) WITH CHECK (true);

-- USERS
CREATE POLICY "permissive_all_users" ON public.users
  FOR ALL USING (true) WITH CHECK (true);