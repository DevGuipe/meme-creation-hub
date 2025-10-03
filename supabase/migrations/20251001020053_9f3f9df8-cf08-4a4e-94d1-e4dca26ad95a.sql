-- ============================================
-- RESET COMPLETO DO BANCO - VERSÃO CORRIGIDA
-- ============================================

-- 1. DROP POLICIES (todas as referências)
-- ============================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on public tables
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
    
    -- Drop all storage policies
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'storage') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 2. DROP FUNÇÕES
-- ============================================
DROP FUNCTION IF EXISTS public.check_user_exists_by_telegram_id(bigint) CASCADE;
DROP FUNCTION IF EXISTS public.create_user_if_not_exists(bigint, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_id_by_telegram_id(bigint) CASCADE;
DROP FUNCTION IF EXISTS public.generate_meme_short_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_ranking(bigint) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_rankings() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_week_rankings() CASCADE;
DROP FUNCTION IF EXISTS public.get_weekly_rankings_for_period(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_memes(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_testosterone_score(bigint) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_popcat_score(bigint) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_telegram_id(uuid) CASCADE;

-- 3. DROP TABELAS (ordem reversa de dependências)
-- ============================================
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.reactions CASCADE;
DROP TABLE IF EXISTS public.leaderboard_snapshots CASCADE;
DROP TABLE IF EXISTS public.popcat_events CASCADE;
DROP TABLE IF EXISTS public.testo_events CASCADE;
DROP TABLE IF EXISTS public.memes CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 4. DROP ENUMS
-- ============================================
DROP TYPE IF EXISTS public.report_status CASCADE;
DROP TYPE IF EXISTS public.reaction_type CASCADE;
DROP TYPE IF EXISTS public.popcat_source CASCADE;
DROP TYPE IF EXISTS public.asset_type CASCADE;

-- 5. RECRIAR ENUMS
-- ============================================
CREATE TYPE public.asset_type AS ENUM ('background', 'body', 'prop');

CREATE TYPE public.popcat_source AS ENUM (
  'save_meme', 'face_upload', 'publish', 'publish_group',
  'reaction', 'reaction_thumbs', 'reaction_laugh', 'reaction_flex',
  'reaction_popcat', 'reaction_moai', 'weekly_challenge',
  'weekly_winner', 'tournament'
);

CREATE TYPE public.reaction_type AS ENUM ('thumbs_up', 'laugh', 'flex', 'popcat', 'moai');

CREATE TYPE public.report_status AS ENUM ('pending', 'approved', 'rejected');

-- 6. RECRIAR TABELAS
-- ============================================

-- users
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_telegram_id ON public.users(telegram_id);

-- templates
CREATE TABLE public.templates (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  manifest_json JSONB NOT NULL,
  thumb_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- assets
CREATE TABLE public.assets (
  key TEXT PRIMARY KEY,
  type public.asset_type NOT NULL,
  url TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assets_type ON public.assets(type);

-- memes
CREATE TABLE public.memes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_short TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL REFERENCES public.templates(key) ON DELETE RESTRICT,
  layers_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_urls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_memes_owner_short ON public.memes(owner_id, id_short) WHERE deleted_at IS NULL;
CREATE INDEX idx_memes_owner_created ON public.memes(owner_id, created_at DESC);
CREATE INDEX idx_memes_short_id ON public.memes(id_short);

-- popcat_events (renomeada de testo_events)
CREATE TABLE public.popcat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source public.popcat_source NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  meme_id UUID REFERENCES public.memes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_popcat_events_user_created ON public.popcat_events(user_id, created_at DESC);
CREATE INDEX idx_popcat_events_created ON public.popcat_events(created_at DESC);

-- leaderboard_snapshots
CREATE TABLE public.leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_leaderboard_week_user ON public.leaderboard_snapshots(week_id, user_id);
CREATE INDEX idx_leaderboard_week_rank ON public.leaderboard_snapshots(week_id, rank);

-- reactions
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meme_id UUID NOT NULL REFERENCES public.memes(id) ON DELETE CASCADE,
  reactor_telegram_id BIGINT NOT NULL,
  type public.reaction_type NOT NULL,
  message_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_reactions_unique ON public.reactions(meme_id, reactor_telegram_id, type);
CREATE INDEX idx_reactions_meme ON public.reactions(meme_id);

-- reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meme_id UUID NOT NULL REFERENCES public.memes(id) ON DELETE CASCADE,
  reporter_telegram_id BIGINT NOT NULL,
  message_id TEXT NOT NULL,
  reason TEXT,
  status public.report_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_meme ON public.reports(meme_id);
CREATE INDEX idx_reports_status ON public.reports(status);

-- 7. RECRIAR FUNÇÕES
-- ============================================

CREATE OR REPLACE FUNCTION public.check_user_exists_by_telegram_id(telegram_user_id BIGINT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE telegram_id = telegram_user_id);
END; $$;

CREATE OR REPLACE FUNCTION public.create_user_if_not_exists(telegram_user_id BIGINT, user_first_name TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE user_uuid UUID; BEGIN
  SELECT id INTO user_uuid FROM public.users WHERE telegram_id = telegram_user_id;
  IF user_uuid IS NULL THEN
    INSERT INTO public.users (telegram_id, first_name) VALUES (telegram_user_id, user_first_name) RETURNING id INTO user_uuid;
  END IF;
  RETURN user_uuid;
END; $$;

CREATE OR REPLACE FUNCTION public.get_user_id_by_telegram_id(telegram_user_id BIGINT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE user_uuid UUID; BEGIN
  SELECT id INTO user_uuid FROM public.users WHERE telegram_id = telegram_user_id;
  RETURN user_uuid;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_meme_short_id(owner_uuid UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE short_id TEXT; attempts INTEGER := 0; max_attempts INTEGER := 100; BEGIN
  LOOP
    short_id := LPAD(floor(random() * 999999 + 1)::TEXT, 4, '0');
    IF NOT EXISTS (SELECT 1 FROM public.memes WHERE owner_id = owner_uuid AND id_short = short_id AND deleted_at IS NULL) THEN
      RETURN short_id;
    END IF;
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique short ID after % attempts', max_attempts;
    END IF;
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.get_user_ranking(user_telegram_id BIGINT)
RETURNS TABLE(user_id UUID, total_score BIGINT, weekly_score BIGINT, global_rank BIGINT, weekly_rank BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE target_user_id UUID; BEGIN
  SELECT id INTO target_user_id FROM public.users WHERE telegram_id = user_telegram_id;
  IF target_user_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  WITH user_scores AS (
    SELECT u.id as uid, COALESCE(SUM(pe.amount), 0) as total,
           COALESCE(SUM(CASE WHEN pe.created_at >= date_trunc('week', CURRENT_DATE) THEN pe.amount ELSE 0 END), 0) as weekly
    FROM public.users u LEFT JOIN public.popcat_events pe ON u.id = pe.user_id
    WHERE u.id = target_user_id GROUP BY u.id
  ),
  global_rank AS (
    SELECT u.id, ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pe.amount), 0) DESC) as rank
    FROM public.users u LEFT JOIN public.popcat_events pe ON u.id = pe.user_id GROUP BY u.id
  ),
  weekly_rank AS (
    SELECT u.id, ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(pe.amount), 0) DESC) as rank
    FROM public.users u LEFT JOIN public.popcat_events pe ON u.id = pe.user_id
    WHERE pe.created_at >= date_trunc('week', CURRENT_DATE) OR pe.id IS NULL GROUP BY u.id
  )
  SELECT us.uid, us.total, us.weekly, gr.rank, wr.rank
  FROM user_scores us LEFT JOIN global_rank gr ON us.uid = gr.id LEFT JOIN weekly_rank wr ON us.uid = wr.id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_user_rankings()
RETURNS TABLE(user_id UUID, telegram_id BIGINT, first_name TEXT, total_score BIGINT, weekly_score BIGINT, global_rank BIGINT, weekly_rank BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN QUERY
  WITH user_scores AS (
    SELECT u.id as uid, u.telegram_id as utid, u.first_name as ufn, COALESCE(SUM(pe.amount), 0) as total,
           COALESCE(SUM(CASE WHEN pe.created_at >= date_trunc('week', CURRENT_DATE) THEN pe.amount ELSE 0 END), 0) as weekly
    FROM public.users u LEFT JOIN public.popcat_events pe ON u.id = pe.user_id
    GROUP BY u.id, u.telegram_id, u.first_name
  ),
  global_ranks AS (SELECT uid, ROW_NUMBER() OVER (ORDER BY total DESC) as grank FROM user_scores),
  weekly_ranks AS (SELECT uid, ROW_NUMBER() OVER (ORDER BY weekly DESC) as wrank FROM user_scores)
  SELECT us.uid, us.utid, us.ufn, us.total, us.weekly, gr.grank, wr.wrank
  FROM user_scores us LEFT JOIN global_ranks gr ON us.uid = gr.uid LEFT JOIN weekly_ranks wr ON us.uid = wr.uid
  ORDER BY us.total DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.get_current_week_rankings()
RETURNS TABLE(user_id UUID, telegram_id BIGINT, first_name TEXT, weekly_score BIGINT, weekly_rank BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN QUERY
  WITH weekly_scores AS (
    SELECT u.id as uid, u.telegram_id as utid, u.first_name as ufn, COALESCE(SUM(pe.amount), 0) as wscore
    FROM public.users u LEFT JOIN public.popcat_events pe ON u.id = pe.user_id
      AND pe.created_at >= date_trunc('week', CURRENT_DATE)
      AND pe.created_at < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'
    GROUP BY u.id, u.telegram_id, u.first_name
    HAVING COALESCE(SUM(pe.amount), 0) > 0
  )
  SELECT ws.uid, ws.utid, ws.ufn, ws.wscore, ROW_NUMBER() OVER (ORDER BY ws.wscore DESC) as wrank
  FROM weekly_scores ws ORDER BY ws.wscore DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.get_weekly_rankings_for_period(start_date TEXT, end_date TEXT)
RETURNS TABLE(user_id UUID, telegram_id BIGINT, first_name TEXT, weekly_score BIGINT, weekly_rank BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN QUERY
  WITH period_scores AS (
    SELECT u.id as uid, u.telegram_id as utid, u.first_name as ufn, COALESCE(SUM(pe.amount), 0) as pscore
    FROM public.users u LEFT JOIN public.popcat_events pe ON u.id = pe.user_id
      AND pe.created_at >= start_date::timestamptz AND pe.created_at <= end_date::timestamptz
    GROUP BY u.id, u.telegram_id, u.first_name
    HAVING COALESCE(SUM(pe.amount), 0) > 0
  )
  SELECT ps.uid, ps.utid, ps.ufn, ps.pscore, ROW_NUMBER() OVER (ORDER BY ps.pscore DESC) as prank
  FROM period_scores ps ORDER BY ps.pscore DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.get_user_memes(user_uuid UUID)
RETURNS TABLE(id UUID, id_short TEXT, owner_id UUID, template_key TEXT, layers_payload JSONB, image_urls JSONB, created_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN QUERY
  SELECT m.id, m.id_short, m.owner_id, m.template_key, m.layers_payload, m.image_urls, m.created_at, m.deleted_at
  FROM public.memes m WHERE m.owner_id = user_uuid AND m.deleted_at IS NULL
  ORDER BY m.created_at DESC LIMIT 50;
END; $$;

-- 8. HABILITAR RLS E CRIAR POLICIES
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popcat_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users: service role apenas
CREATE POLICY "Service role full access" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- Templates: leitura pública, escrita service role
CREATE POLICY "Public read templates" ON public.templates FOR SELECT USING (true);
CREATE POLICY "Service role manage templates" ON public.templates FOR ALL USING (true) WITH CHECK (true);

-- Assets: leitura pública, escrita service role
CREATE POLICY "Public read assets" ON public.assets FOR SELECT USING (true);
CREATE POLICY "Service role manage assets" ON public.assets FOR ALL USING (true) WITH CHECK (true);

-- Memes: leitura pública (não deletados), escrita service role
CREATE POLICY "Public read memes" ON public.memes FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Service role manage memes" ON public.memes FOR ALL USING (true) WITH CHECK (true);

-- Popcat events: leitura pública, escrita service role
CREATE POLICY "Public read popcat events" ON public.popcat_events FOR SELECT USING (true);
CREATE POLICY "Service role manage popcat events" ON public.popcat_events FOR ALL USING (true) WITH CHECK (true);

-- Leaderboard: leitura pública, escrita service role
CREATE POLICY "Public read leaderboard" ON public.leaderboard_snapshots FOR SELECT USING (true);
CREATE POLICY "Service role manage leaderboard" ON public.leaderboard_snapshots FOR ALL USING (true) WITH CHECK (true);

-- Reactions: leitura pública, escrita service role
CREATE POLICY "Public read reactions" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Service role manage reactions" ON public.reactions FOR ALL USING (true) WITH CHECK (true);

-- Reports: leitura pública, escrita service role
CREATE POLICY "Public read reports" ON public.reports FOR SELECT USING (true);
CREATE POLICY "Service role manage reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);

-- 9. STORAGE BUCKET E POLICIES
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('memes', 'memes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public view meme images" ON storage.objects FOR SELECT USING (bucket_id = 'memes');
CREATE POLICY "Service upload memes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'memes');
CREATE POLICY "Service update memes" ON storage.objects FOR UPDATE USING (bucket_id = 'memes');
CREATE POLICY "Service delete memes" ON storage.objects FOR DELETE USING (bucket_id = 'memes');