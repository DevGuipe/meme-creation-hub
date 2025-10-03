-- Temporarily make UPDATE and DELETE policies more permissive for debugging
DROP POLICY IF EXISTS "Allow meme updates" ON public.memes;
DROP POLICY IF EXISTS "Allow meme deletion" ON public.memes;

-- Create more permissive policies for debugging
CREATE POLICY "Allow meme updates - debug"
ON public.memes
FOR UPDATE
USING (true);  -- Temporarily allow all updates

CREATE POLICY "Allow meme deletion - debug"
ON public.memes  
FOR DELETE
USING (true);  -- Temporarily allow all deletions