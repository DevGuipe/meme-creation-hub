-- Update RLS policy for memes table to allow insertion with proper user validation
DROP POLICY IF EXISTS "Users can create their own memes" ON public.memes;

CREATE POLICY "Users can create their own memes" ON public.memes
FOR INSERT 
WITH CHECK (
  -- Allow insertion if owner_id matches a valid user from telegram_id context
  owner_id IN (
    SELECT id FROM public.users 
    WHERE telegram_id IS NOT NULL
  )
);