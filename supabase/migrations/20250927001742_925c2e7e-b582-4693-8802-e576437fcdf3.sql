-- Create a function to get current user by telegram ID from session
create or replace function public.get_current_user_by_telegram()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users 
  where telegram_id = (
    select telegram_id from public.users 
    where id = auth.uid()
  );
$$;

-- Update RLS policies to properly check ownership for UPDATE and DELETE
drop policy if exists "Allow meme updates" on public.memes;
drop policy if exists "Allow meme deletion" on public.memes;

-- Policy for UPDATE: only owner can update their memes
create policy "Allow meme updates"
on public.memes
for update
using (
  owner_id = auth.uid() OR
  owner_id = public.get_current_user_by_telegram()
);

-- Policy for DELETE: only owner can delete their memes
create policy "Allow meme deletion"
on public.memes
for delete
using (
  owner_id = auth.uid() OR
  owner_id = public.get_current_user_by_telegram()
);