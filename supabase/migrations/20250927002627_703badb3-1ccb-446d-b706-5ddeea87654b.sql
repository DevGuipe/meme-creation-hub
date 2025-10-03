-- Create a function to create user if not exists
CREATE OR REPLACE FUNCTION public.create_user_if_not_exists(
  telegram_user_id bigint,
  user_first_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid uuid;
BEGIN
  -- First try to get existing user
  SELECT id INTO user_uuid 
  FROM users 
  WHERE telegram_id = telegram_user_id;
  
  -- If user doesn't exist, create them
  IF user_uuid IS NULL THEN
    INSERT INTO users (telegram_id, first_name)
    VALUES (telegram_user_id, user_first_name)
    RETURNING id INTO user_uuid;
  END IF;
  
  RETURN user_uuid;
END;
$$;