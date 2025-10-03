-- Fix security warnings: set search_path for functions

-- Update get_user_testosterone_score function with proper search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update generate_meme_short_id function with proper search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;