-- Temporarily disable all RLS policies to allow testing
DROP POLICY IF EXISTS "Allow meme creation" ON public.memes;
DROP POLICY IF EXISTS "Allow meme updates" ON public.memes;
DROP POLICY IF EXISTS "Allow meme deletion" ON public.memes;
DROP POLICY IF EXISTS "Public can view active memes" ON public.memes;

-- Create completely permissive policy for testing
CREATE POLICY "Allow all operations - temp"
ON public.memes
FOR ALL
USING (true)
WITH CHECK (true);