-- CHAD Maker Database Schema
-- Based on the specification data model

-- Users table for CHAD Maker
CREATE TABLE public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Templates for meme creation
CREATE TABLE public.templates (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    manifest_json JSONB NOT NULL,
    thumb_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assets (backgrounds, bodies, props)
CREATE TYPE public.asset_type AS ENUM ('background', 'body', 'prop');

CREATE TABLE public.assets (
    key TEXT PRIMARY KEY,
    type asset_type NOT NULL,
    url TEXT NOT NULL,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Memes table
CREATE TABLE public.memes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    id_short TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    template_key TEXT NOT NULL REFERENCES public.templates(key),
    layers_payload JSONB NOT NULL DEFAULT '{}',
    image_urls JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create unique constraint for short IDs per user
CREATE UNIQUE INDEX idx_memes_owner_id_short ON public.memes(owner_id, id_short) WHERE deleted_at IS NULL;

-- Reactions for inline buttons
CREATE TYPE public.reaction_type AS ENUM ('thumbs_up', 'laugh');

CREATE TABLE public.reactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id TEXT NOT NULL,
    reactor_telegram_id BIGINT NOT NULL,
    meme_id UUID NOT NULL REFERENCES public.memes(id) ON DELETE CASCADE,
    type reaction_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(message_id, reactor_telegram_id, type)
);

-- Testosterone events for gamification
CREATE TYPE public.testo_source AS ENUM ('save_meme', 'self_chad', 'publish', 'reaction', 'weekly_challenge', 'tournament');

CREATE TABLE public.testo_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    source testo_source NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    meme_id UUID REFERENCES public.memes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Leaderboard snapshots
CREATE TABLE public.leaderboard_snapshots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    week_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    rank INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(week_id, user_id)
);

-- Reports for moderation
CREATE TYPE public.report_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id TEXT NOT NULL,
    reporter_telegram_id BIGINT NOT NULL,
    meme_id UUID NOT NULL REFERENCES public.memes(id) ON DELETE CASCADE,
    reason TEXT,
    status report_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testo_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: users can view and update their own data
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (telegram_id = (current_setting('app.telegram_id'))::BIGINT);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (telegram_id = (current_setting('app.telegram_id'))::BIGINT);

-- Templates and Assets: readable by all authenticated users
CREATE POLICY "Templates are viewable by all users" ON public.templates
    FOR SELECT USING (true);

CREATE POLICY "Assets are viewable by all users" ON public.assets
    FOR SELECT USING (true);

-- Memes: users can manage their own memes
CREATE POLICY "Users can view their own memes" ON public.memes
    FOR SELECT USING (owner_id IN (
        SELECT id FROM public.users WHERE telegram_id = (current_setting('app.telegram_id'))::BIGINT
    ));

CREATE POLICY "Users can create their own memes" ON public.memes
    FOR INSERT WITH CHECK (owner_id IN (
        SELECT id FROM public.users WHERE telegram_id = (current_setting('app.telegram_id'))::BIGINT
    ));

CREATE POLICY "Users can update their own memes" ON public.memes
    FOR UPDATE USING (owner_id IN (
        SELECT id FROM public.users WHERE telegram_id = (current_setting('app.telegram_id'))::BIGINT
    ));

CREATE POLICY "Users can delete their own memes" ON public.memes
    FOR DELETE USING (owner_id IN (
        SELECT id FROM public.users WHERE telegram_id = (current_setting('app.telegram_id'))::BIGINT
    ));

-- Reactions: users can view all, but only create their own
CREATE POLICY "Users can view all reactions" ON public.reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own reactions" ON public.reactions
    FOR INSERT WITH CHECK (reactor_telegram_id = (current_setting('app.telegram_id'))::BIGINT);

-- Testo events: users can view their own
CREATE POLICY "Users can view their own testo events" ON public.testo_events
    FOR SELECT USING (user_id IN (
        SELECT id FROM public.users WHERE telegram_id = (current_setting('app.telegram_id'))::BIGINT
    ));

CREATE POLICY "System can create testo events" ON public.testo_events
    FOR INSERT WITH CHECK (true);

-- Leaderboards: readable by all
CREATE POLICY "Leaderboards are viewable by all users" ON public.leaderboard_snapshots
    FOR SELECT USING (true);

-- Reports: users can create reports, admins can manage
CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (reporter_telegram_id = (current_setting('app.telegram_id'))::BIGINT);

CREATE POLICY "Users can view all reports" ON public.reports
    FOR SELECT USING (true);

-- Functions to get user testosterone score
CREATE OR REPLACE FUNCTION public.get_user_testosterone_score(user_telegram_id BIGINT)
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE((
        SELECT SUM(amount)
        FROM public.testo_events te
        JOIN public.users u ON te.user_id = u.id
        WHERE u.telegram_id = user_telegram_id
    ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate short meme ID
CREATE OR REPLACE FUNCTION public.generate_meme_short_id(owner_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    short_id TEXT;
    attempts INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    LOOP
        -- Generate 4-6 digit random number
        short_id := LPAD(floor(random() * 999999 + 1)::TEXT, 4, '0');
        
        -- Check if it's unique for this user
        IF NOT EXISTS (
            SELECT 1 FROM public.memes 
            WHERE owner_id = owner_uuid 
            AND id_short = short_id 
            AND deleted_at IS NULL
        ) THEN
            RETURN short_id;
        END IF;
        
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Could not generate unique short ID after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;