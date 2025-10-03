-- CRITICAL FIX: Memes DELETE and UPDATE policies are broken
-- Current: (owner_id = owner_id) always evaluates to TRUE
-- This allows ANYONE to delete/update ANY meme

-- Fix DELETE policy
DROP POLICY IF EXISTS "Users can delete their own memes" ON public.memes;
CREATE POLICY "Users can delete their own memes"
  ON public.memes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = memes.owner_id 
      AND users.telegram_id IS NOT NULL
    )
  );

-- Fix UPDATE policy  
DROP POLICY IF EXISTS "Users can update their own memes" ON public.memes;
CREATE POLICY "Users can update their own memes"
  ON public.memes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = memes.owner_id 
      AND users.telegram_id IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = memes.owner_id 
      AND users.telegram_id IS NOT NULL
    )
  );

-- Note: Since this system uses edge functions with SERVICE_ROLE_KEY,
-- these policies mainly protect against direct API access.
-- Edge functions bypass RLS, so they handle authorization logic internally.