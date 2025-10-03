-- Remove the debug policy and create proper working policies
DROP POLICY IF EXISTS "Allow all meme operations - debug" ON public.memes;

-- Create simple, functional policies for the app's authentication model
-- Since the app doesn't use Supabase auth (auth.uid() is null), we'll use simpler policies

-- Policy for viewing memes (public, only non-deleted ones)
CREATE POLICY "Public can view active memes"
ON public.memes
FOR SELECT
USING (deleted_at IS NULL);

-- Policy for creating memes (allow if owner_id exists in users table)
CREATE POLICY "Allow meme creation"
ON public.memes
FOR INSERT
WITH CHECK (
  owner_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM users WHERE id = owner_id)
);

-- Policy for updating memes (allow if owner_id exists in users table)
CREATE POLICY "Allow meme updates"
ON public.memes
FOR UPDATE
USING (
  owner_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM users WHERE id = owner_id)
);

-- Policy for deleting memes (allow if owner_id exists in users table)
CREATE POLICY "Allow meme deletion"
ON public.memes
FOR DELETE
USING (
  owner_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM users WHERE id = owner_id)
);