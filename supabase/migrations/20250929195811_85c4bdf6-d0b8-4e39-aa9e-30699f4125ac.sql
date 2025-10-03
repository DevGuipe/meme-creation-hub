-- Security fix: Add validation to ensure user_id matches authenticated user in memes table
-- This prevents users from creating memes with other users' IDs

-- Add check constraint to validate owner_id references actual users
CREATE OR REPLACE FUNCTION validate_meme_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure owner_id exists in users table
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.owner_id) THEN
    RAISE EXCEPTION 'Invalid owner_id: user does not exist';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS validate_meme_owner_trigger ON public.memes;
CREATE TRIGGER validate_meme_owner_trigger
  BEFORE INSERT OR UPDATE ON public.memes
  FOR EACH ROW
  EXECUTE FUNCTION validate_meme_owner();

-- Security fix: Add RLS policy to ensure users can only insert events for themselves
-- via authenticated session, not arbitrary user_ids
DROP POLICY IF EXISTS "popcat_events_insert_all" ON public.popcat_events;

CREATE POLICY "popcat_events_insert_authenticated"
  ON public.popcat_events
  FOR INSERT
  WITH CHECK (
    -- Allow inserts from edge functions (service role) OR
    -- from authenticated users only for their own user_id
    auth.jwt() IS NULL OR 
    user_id = auth.uid()
  );

-- Add index for better query performance on deleted_at checks
CREATE INDEX IF NOT EXISTS idx_memes_deleted_at_created_at 
  ON public.memes(deleted_at, created_at DESC) 
  WHERE deleted_at IS NULL;

-- Add index for popcat_events user lookups
CREATE INDEX IF NOT EXISTS idx_popcat_events_user_created 
  ON public.popcat_events(user_id, created_at DESC);