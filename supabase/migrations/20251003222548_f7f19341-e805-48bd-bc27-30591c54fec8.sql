-- Create function to generate deterministic short ID for memes
CREATE OR REPLACE FUNCTION public.generate_meme_short_id(owner_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_short_id TEXT;
  counter INT := 0;
  max_attempts INT := 100;
BEGIN
  -- Generate a 4-6 digit short ID based on current count + random component
  LOOP
    -- Generate short ID: 4-6 digits
    new_short_id := LPAD(
      (EXTRACT(EPOCH FROM NOW())::BIGINT % 900000 + 100000 + counter)::TEXT, 
      6, 
      '0'
    );
    
    -- Check if this ID is already taken
    IF NOT EXISTS (SELECT 1 FROM public.memes WHERE id_short = new_short_id) THEN
      RETURN new_short_id;
    END IF;
    
    counter := counter + 1;
    
    -- Safety: prevent infinite loops
    IF counter >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique short ID after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;