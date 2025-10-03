-- Create RLS policies for storage bucket 'memes'
-- Allow everyone to view images in the public memes bucket
CREATE POLICY "Anyone can view meme images"
ON storage.objects FOR SELECT
USING (bucket_id = 'memes');

-- Allow authenticated users to upload memes
CREATE POLICY "Authenticated users can upload meme images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'memes' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their own meme images
CREATE POLICY "Authenticated users can update meme images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'memes' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their own meme images
CREATE POLICY "Authenticated users can delete meme images"
ON storage.objects FOR DELETE
USING (bucket_id = 'memes' AND auth.role() = 'authenticated');