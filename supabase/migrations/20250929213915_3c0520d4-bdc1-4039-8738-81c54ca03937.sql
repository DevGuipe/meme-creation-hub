-- Update users RLS policy to be more secure
-- Remove the unsafe NULL auth check that allows public insertions
DROP POLICY IF EXISTS "Allow user registration" ON public.users;

CREATE POLICY "Allow authenticated user registration"
ON public.users
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND telegram_id IS NOT NULL
);