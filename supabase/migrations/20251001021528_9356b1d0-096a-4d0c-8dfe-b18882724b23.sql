-- Remove insecure policy that allowed any user to soft-delete any meme
DROP POLICY IF EXISTS "users_can_soft_delete_own_memes" ON public.memes;

-- Now all meme deletions must go through the secure delete-meme edge function
-- which validates ownership before performing the soft delete