-- Fix critical RLS policy vulnerability in memes table
DROP POLICY IF EXISTS "Users can create their own memes" ON public.memes;

CREATE POLICY "Users can create their own memes" ON public.memes
FOR INSERT 
WITH CHECK (
  -- Allow insertion only if owner_id matches the current authenticated user
  -- AND the owner_id exists in users table with valid telegram_id
  owner_id IN (
    SELECT id FROM public.users 
    WHERE id = auth.uid() 
    AND telegram_id IS NOT NULL
  )
);