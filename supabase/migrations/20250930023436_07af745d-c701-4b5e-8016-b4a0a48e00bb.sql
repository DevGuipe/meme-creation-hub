-- Fix broken RLS policy that was causing gallery access issues
-- The policy was referencing memes.owner_id inside the policy itself, creating a circular reference

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their own memes" ON public.memes;

-- Create a corrected policy that properly checks ownership
CREATE POLICY "Users can view their own memes"
ON public.memes
FOR SELECT
USING (
  owner_id IN (
    SELECT u.id 
    FROM users u 
    WHERE u.id = auth.uid()
      AND u.telegram_id IS NOT NULL
  )
);

-- Also fix the INSERT policy to be more consistent
DROP POLICY IF EXISTS "Users can insert their own memes" ON public.memes;

CREATE POLICY "Users can insert their own memes"
ON public.memes
FOR INSERT
WITH CHECK (
  owner_id IN (
    SELECT u.id 
    FROM users u 
    WHERE u.id = auth.uid()
      AND u.telegram_id IS NOT NULL
  )
);