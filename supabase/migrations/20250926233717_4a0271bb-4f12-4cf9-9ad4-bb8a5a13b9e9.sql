-- CRITICAL SECURITY FIX: Restrict users table access
-- Remove the dangerous public access policy

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Create much more restrictive policy - users can only see their own data when authenticated
CREATE POLICY "Users can view only their own profile when authenticated" 
ON public.users 
FOR SELECT 
TO authenticated 
USING (id = auth.uid());

-- Create a separate policy for system operations (like telegram webhook registration)
-- This allows unauthenticated access only for checking if a user exists during registration
CREATE POLICY "Allow registration checks"
ON public.users
FOR SELECT
TO public
USING (
  -- Only allow reading telegram_id field for registration purposes
  -- This is safe because it only allows checking existence, not reading personal data
  false -- We'll handle this through a security definer function instead
);

-- Remove the above policy as it's still not safe
DROP POLICY IF EXISTS "Allow registration checks" ON public.users;

-- Create a security definer function for safe user lookup during registration
CREATE OR REPLACE FUNCTION public.check_user_exists_by_telegram_id(telegram_user_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE telegram_id = telegram_user_id
  );
END;
$$;

-- Create another security definer function to get user ID by telegram ID (for authenticated operations)
CREATE OR REPLACE FUNCTION public.get_user_id_by_telegram_id(telegram_user_id bigint)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid uuid;
BEGIN
  SELECT id INTO user_uuid 
  FROM users 
  WHERE telegram_id = telegram_user_id;
  
  RETURN user_uuid;
END;
$$;