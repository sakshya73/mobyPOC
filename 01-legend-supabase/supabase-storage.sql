-- Run this in the Supabase SQL Editor AFTER supabase.sql.
-- Sets up media storage (all-Supabase, no S3) for photo/voice attachments.

-- 1) A public 'media' bucket for the blobs.
--    (If this insert is blocked, create the bucket in the dashboard: Storage → New bucket →
--     name "media", toggle "Public bucket" ON.)
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- 2) POC access: let the anon (publishable) key upload/read/update objects in 'media'.
drop policy if exists "poc_media_insert" on storage.objects;
create policy "poc_media_insert" on storage.objects
  for insert to anon with check (bucket_id = 'media');

drop policy if exists "poc_media_select" on storage.objects;
create policy "poc_media_select" on storage.objects
  for select to anon using (bucket_id = 'media');

drop policy if exists "poc_media_update" on storage.objects;
create policy "poc_media_update" on storage.objects
  for update to anon using (bucket_id = 'media') with check (bucket_id = 'media');

-- 3) Media metadata on notes (these columns SYNC via Legend-State; the blob does not).
alter table notes add column if not exists media_type   text;   -- 'photo' | 'audio'
alter table notes add column if not exists storage_path text;   -- key in the 'media' bucket; null until uploaded
