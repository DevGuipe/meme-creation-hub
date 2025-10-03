-- Remove old function with testosterone reference
DROP FUNCTION IF EXISTS get_user_testosterone_score(bigint);

-- Remove old testo_source enum completely
DROP TYPE IF EXISTS testo_source CASCADE;

-- Create new function with POPCAT naming
CREATE OR REPLACE FUNCTION get_user_popcat_score(user_telegram_id bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN COALESCE((
        SELECT SUM(amount)
        FROM public.popcat_events pe
        JOIN public.users u ON pe.user_id = u.id
        WHERE u.telegram_id = user_telegram_id
    ), 0);
END;
$$;