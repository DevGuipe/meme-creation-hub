-- Fix infinite recursion in users table policies
-- The issue is that the SELECT policy is referencing the same table it's protecting

-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Create a non-recursive SELECT policy
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (
  -- Allow authenticated users to see their own profile
  (auth.uid() IS NOT NULL AND id = auth.uid())
  OR
  -- Allow anonymous access for Telegram authentication process
  (auth.uid() IS NULL)
);

-- Also update the UPDATE policy to avoid recursion
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (id = auth.uid());