-- Temporarily make ALL policies permissive for debugging
DROP POLICY IF EXISTS "Allow meme creation" ON public.memes;
DROP POLICY IF EXISTS "Allow meme updates - debug" ON public.memes;
DROP POLICY IF EXISTS "Allow meme deletion - debug" ON public.memes;
DROP POLICY IF EXISTS "Public can view active memes" ON public.memes;

-- Create completely permissive policies for testing
CREATE POLICY "Allow all meme operations - debug"
ON public.memes
FOR ALL
USING (true)
WITH CHECK (true);