-- Clean up users table policies (may have old inconsistent naming)
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
  END LOOP;
END $$;

-- Recreate users policies with consistent naming
CREATE POLICY "service_role_full_users"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);