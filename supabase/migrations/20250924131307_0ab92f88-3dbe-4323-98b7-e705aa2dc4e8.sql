-- Create function to add testosterone points and handle RLS context
CREATE OR REPLACE FUNCTION add_testosterone_points(
  points integer,
  source testo_source,
  meme_short_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  target_meme_id uuid DEFAULT NULL;
BEGIN
  -- Get user_id from current telegram_id setting
  SELECT id INTO target_user_id
  FROM users
  WHERE telegram_id = (current_setting('app.telegram_id'))::bigint;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found for current telegram_id';
  END IF;
  
  -- Get meme_id if meme_short_id is provided
  IF meme_short_id IS NOT NULL THEN
    SELECT id INTO target_meme_id
    FROM memes
    WHERE id_short = meme_short_id AND owner_id = target_user_id;
  END IF;
  
  -- Insert testosterone event
  INSERT INTO testo_events (user_id, source, amount, meme_id)
  VALUES (target_user_id, source, points, target_meme_id);
END;
$$;

-- Create function to get user testosterone score with RLS context
CREATE OR REPLACE FUNCTION get_user_testosterone_score()
RETURNS TABLE(total_score integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user_id from current telegram_id setting
  SELECT id INTO target_user_id
  FROM users
  WHERE telegram_id = (current_setting('app.telegram_id'))::bigint;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found for current telegram_id';
  END IF;
  
  RETURN QUERY
  SELECT COALESCE(SUM(te.amount), 0)::integer as total_score
  FROM testo_events te
  WHERE te.user_id = target_user_id;
END;
$$;

-- Create function to set config for RLS
CREATE OR REPLACE FUNCTION set_config(
  setting_name text,
  setting_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, false);
END;
$$;