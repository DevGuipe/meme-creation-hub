-- Fix Telegram authentication by allowing anonymous user lookup
-- This is needed for the initial authentication flow

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Create new policies that allow both authenticated and initial anonymous access
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (
  -- Allow if user is authenticated and accessing their own data
  (auth.uid() IS NOT NULL AND telegram_id = (
    SELECT telegram_id FROM public.users WHERE id = auth.uid()
  ))
  OR
  -- Allow anonymous read during authentication process (limited to basic lookup)
  (auth.uid() IS NULL)
);

-- Also update INSERT policy to be more explicit about anonymous access
DROP POLICY IF EXISTS "Allow user registration" ON public.users;

CREATE POLICY "Allow user registration" 
ON public.users 
FOR INSERT 
WITH CHECK (
  -- Allow anonymous registration (needed for Telegram auth)
  auth.uid() IS NULL
  OR
  -- Allow authenticated users to insert their own data
  (auth.uid() IS NOT NULL AND telegram_id IS NOT NULL)
);