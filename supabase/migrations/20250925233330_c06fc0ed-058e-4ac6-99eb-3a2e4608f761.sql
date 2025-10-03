-- Create public storage bucket for memes
insert into storage.buckets (id, name, public)
values ('memes', 'memes', true)
on conflict (id) do nothing;

-- Allow public read access to files in the 'memes' bucket
create policy "Public read memes"
on storage.objects for select
using (bucket_id = 'memes');