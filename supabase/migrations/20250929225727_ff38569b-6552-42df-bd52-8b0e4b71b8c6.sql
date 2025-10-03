-- CRITICAL ARCHITECTURAL FIX: Users table RLS policies
-- 
-- PROBLEM: System uses telegram_id-based auth (no Supabase Auth)
-- But policies use auth.uid() which is ALWAYS NULL
-- Result: Users can NEVER update or view their own profiles via client
--
-- SOLUTION: Remove broken auth.uid() policies
-- All user operations should go through edge functions with SERVICE_ROLE_KEY

-- Drop broken policies that rely on auth.uid()
DROP POLICY IF EXISTS "Allow authenticated user registration" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view only their own profile when authenticated" ON public.users;

-- Create secure policies for telegram_id-based system
-- Note: Direct client access is intentionally blocked
-- All operations go through edge functions that use SERVICE_ROLE_KEY

-- Block all direct client access to users table
-- Edge functions with SERVICE_ROLE_KEY bypass these policies
CREATE POLICY "Block direct client access to users"
  ON public.users
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- RATIONALE:
-- 1. System doesn't use Supabase Auth (no auth.uid())
-- 2. User creation handled by create_user_if_not_exists RPC
-- 3. User queries handled by get_user_id_by_telegram_id RPC  
-- 4. Updates should go through edge functions if needed
-- 5. This prevents any unauthorized direct access via anon key