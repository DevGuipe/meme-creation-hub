-- First drop the policies that depend on the function
DROP POLICY IF EXISTS "Allow meme updates" ON public.memes;
DROP POLICY IF EXISTS "Allow meme deletion" ON public.memes;

-- Then drop the function
DROP FUNCTION IF EXISTS public.get_current_user_by_telegram();

-- Create simpler policies that allow deletion/update for any meme with valid owner_id
-- This works around the lack of auth.uid() in the current setup
CREATE POLICY "Allow meme updates"
ON public.memes
FOR UPDATE
USING (public.user_has_telegram_id(owner_id));

CREATE POLICY "Allow meme deletion"
ON public.memes
FOR DELETE
USING (public.user_has_telegram_id(owner_id));