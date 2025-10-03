-- Create a SECURITY DEFINER helper to bypass RLS when validating owner_id
create or replace function public.user_has_telegram_id(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = uid
      and u.telegram_id is not null
  );
$$;

-- Recreate RLS policies on memes to use the helper function
 drop policy if exists "Allow meme creation" on public.memes;
 drop policy if exists "Allow meme updates" on public.memes;
 drop policy if exists "Allow meme deletion" on public.memes;
 drop policy if exists "Public can view active memes" on public.memes;

create policy "Public can view active memes"
on public.memes
for select
using (deleted_at is null);

create policy "Allow meme creation"
on public.memes
for insert
with check (public.user_has_telegram_id(owner_id));

create policy "Allow meme updates"
on public.memes
for update
using (public.user_has_telegram_id(owner_id));

create policy "Allow meme deletion"
on public.memes
for delete
using (public.user_has_telegram_id(owner_id));