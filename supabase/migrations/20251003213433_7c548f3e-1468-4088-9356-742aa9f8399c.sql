
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  first_name TEXT,
  username TEXT,
  pops_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create memes table
CREATE TABLE IF NOT EXISTS public.memes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_short TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  layers_payload JSONB NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (true);

CREATE POLICY "Memes are viewable by everyone" ON public.memes FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Users can insert own memes" ON public.memes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own memes" ON public.memes FOR UPDATE USING (true);

-- Helper functions
CREATE OR REPLACE FUNCTION public.check_user_exists_by_telegram_id(telegram_user_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.users WHERE telegram_id = telegram_user_id);
$$;

CREATE OR REPLACE FUNCTION public.create_user_if_not_exists(
  telegram_user_id BIGINT,
  user_first_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  INSERT INTO public.users (telegram_id, first_name)
  VALUES (telegram_user_id, user_first_name)
  ON CONFLICT (telegram_id) DO NOTHING
  RETURNING id INTO user_uuid;
  
  IF user_uuid IS NULL THEN
    SELECT id INTO user_uuid FROM public.users WHERE telegram_id = telegram_user_id;
  END IF;
  
  RETURN user_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_id_by_telegram_id(telegram_user_id BIGINT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE telegram_id = telegram_user_id;
$$;
