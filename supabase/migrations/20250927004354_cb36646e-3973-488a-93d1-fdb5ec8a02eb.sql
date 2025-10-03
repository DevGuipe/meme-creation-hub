-- Remove temporary policy and create final working policies
DROP POLICY IF EXISTS "Allow all operations - temp" ON public.memes;

-- Create simple, functional policies that work with the app's architecture

-- 1. Allow public viewing of non-deleted memes
CREATE POLICY "memes_select_policy"
ON public.memes
FOR SELECT
USING (deleted_at IS NULL);

-- 2. Allow inserting memes (simple validation)
CREATE POLICY "memes_insert_policy"
ON public.memes
FOR INSERT
WITH CHECK (owner_id IS NOT NULL);

-- 3. Allow updating memes (simple validation)
CREATE POLICY "memes_update_policy"
ON public.memes
FOR UPDATE
USING (owner_id IS NOT NULL);

-- 4. Allow deleting memes (simple validation)
CREATE POLICY "memes_delete_policy"
ON public.memes
FOR DELETE
USING (owner_id IS NOT NULL);