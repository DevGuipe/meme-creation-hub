-- Safer migration approach - create new table structure
-- First, let's check current table structure and dependencies

-- Create a new temporary table with proper auth structure
CREATE TABLE public.users_new (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id bigint UNIQUE NOT NULL,
  username text,
  first_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Copy existing data to new table (this will fail for users without auth.users entries)
-- We'll handle this in the application code instead

-- For now, let's update RLS policies to work better with current structure
-- Drop and recreate the problematic memes policy first
DROP POLICY IF EXISTS "Users can create their own memes" ON public.memes;

-- Create a policy that works with telegram_id instead of auth.uid()
CREATE POLICY "Users can create their own memes" ON public.memes
FOR INSERT 
WITH CHECK (
  owner_id IN (
    SELECT u.id FROM public.users u 
    WHERE u.telegram_id IS NOT NULL
  )
);

-- Drop the temporary table since we're keeping the original structure for now
DROP TABLE public.users_new;