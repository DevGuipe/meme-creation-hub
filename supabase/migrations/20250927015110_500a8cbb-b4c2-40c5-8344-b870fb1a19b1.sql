-- Ensure UPDATE has WITH CHECK so soft-delete works
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='memes' AND policyname='memes_update_authenticated_check'
  ) THEN
    CREATE POLICY "memes_update_authenticated_check"
    ON public.memes
    FOR UPDATE
    TO public
    WITH CHECK (true);
  END IF;
END $$;