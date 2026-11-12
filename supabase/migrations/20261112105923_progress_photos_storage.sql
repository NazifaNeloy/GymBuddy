-- GymBuddy: private storage bucket for progress photos.
-- Objects live at {user_id}/{uuid}.jpg; users can only touch their own folder.
-- The app shows photos via short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos', 'progress-photos', false, 5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy "progress-photos: read own"
  on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "progress-photos: upload own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'progress-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "progress-photos: update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'progress-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'progress-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "progress-photos: delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'progress-photos'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
