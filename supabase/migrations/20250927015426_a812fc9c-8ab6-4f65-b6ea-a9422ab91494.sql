-- Adjust memes SELECT policy to avoid interfering with UPDATE returns
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='memes' AND policyname='memes_select_all'
  ) THEN
    DROP POLICY "memes_select_all" ON public.memes;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='memes' AND policyname='memes_select_any'
  ) THEN
    CREATE POLICY "memes_select_any"
    ON public.memes
    FOR SELECT
    TO public
    USING (true);
  END IF;
END $$;

-- Ensure UPDATE has both USING and WITH CHECK permissive policy (single policy)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='memes' AND policyname in ('memes_update_authenticated', 'memes_update_authenticated_check')
  ) THEN
    DROP POLICY IF EXISTS "memes_update_authenticated" ON public.memes;
    DROP POLICY IF EXISTS "memes_update_authenticated_check" ON public.memes;
  END IF;

  CREATE POLICY "memes_update_any"
  ON public.memes
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
END $$;