-- ============================================
-- Migration: private camera media storage
-- Makes QR code and installation photo buckets private and
-- restricts object access to the authenticated owner path.
-- ============================================

update storage.buckets
set public = false
where id in ('qr-codes', 'installation-photos');

drop policy if exists "qr_codes_public_read" on storage.objects;
drop policy if exists "qr_codes_select" on storage.objects;
drop policy if exists "qr_codes_insert" on storage.objects;
drop policy if exists "qr_codes_update" on storage.objects;
drop policy if exists "qr_codes_delete" on storage.objects;

create policy "qr_codes_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'qr-codes'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "qr_codes_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'qr-codes'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "qr_codes_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'qr-codes'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'qr-codes'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "qr_codes_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'qr-codes'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "installation_photos_public_read" on storage.objects;
drop policy if exists "installation_photos_select" on storage.objects;
drop policy if exists "installation_photos_insert" on storage.objects;
drop policy if exists "installation_photos_update" on storage.objects;
drop policy if exists "installation_photos_delete" on storage.objects;

create policy "installation_photos_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'installation-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "installation_photos_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'installation-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "installation_photos_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'installation-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'installation-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "installation_photos_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'installation-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );
