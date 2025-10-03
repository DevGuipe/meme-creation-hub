-- Create RPC function to get user memes (bypasses RLS for Telegram auth users)
CREATE OR REPLACE FUNCTION public.get_user_memes(user_uuid uuid)
RETURNS TABLE(
  id uuid,
  id_short text,
  owner_id uuid,
  template_key text,
  layers_payload jsonb,
  image_urls jsonb,
  created_at timestamptz,
  deleted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return memes for the specified user, excluding deleted ones
  RETURN QUERY
  SELECT 
    m.id,
    m.id_short,
    m.owner_id,
    m.template_key,
    m.layers_payload,
    m.image_urls,
    m.created_at,
    m.deleted_at
  FROM memes m
  WHERE m.owner_id = user_uuid
    AND m.deleted_at IS NULL
  ORDER BY m.created_at DESC
  LIMIT 50;
END;
$$;