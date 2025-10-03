-- Allow deleting images from the public 'memes' bucket
DO $$ BEGIN
  -- Create DELETE policy if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public delete memes images'
  ) THEN
    CREATE POLICY "Public delete memes images"
    ON storage.objects
    FOR DELETE
    TO public
    USING (bucket_id = 'memes');
  END IF;

  -- Also allow inserting from client if needed (optional)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public insert memes images'
  ) THEN
    CREATE POLICY "Public insert memes images"
    ON storage.objects
    FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'memes');
  END IF;
END $$;