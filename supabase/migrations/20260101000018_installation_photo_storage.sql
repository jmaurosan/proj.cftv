-- ============================================
-- Migration: Foto do local de instalação da câmera
-- Adiciona coluna installation_photo_url e cria bucket de storage
-- ============================================

-- Adiciona coluna para URL da foto do local de instalação
alter table cameras add column if not exists installation_photo_url text;

-- ============================================
-- Bucket para fotos do local de instalação
-- ============================================

-- Cria bucket privado
insert into storage.buckets (id, name, public)
values ('installation-photos', 'installation-photos', false)
on conflict (id) do nothing;

update storage.buckets
set public = false
where id = 'installation-photos';

-- ============================================
-- Policies (Postgres não suporta CREATE POLICY IF NOT EXISTS,
-- então usamos DROP POLICY IF EXISTS antes de cada CREATE)
-- ============================================

-- Política de leitura pública
drop policy if exists "installation_photos_public_read" on storage.objects;
drop policy if exists "installation_photos_select" on storage.objects;
drop policy if exists "installation_photos_insert" on storage.objects;
drop policy if exists "installation_photos_delete" on storage.objects;
drop policy if exists "installation_photos_update" on storage.objects;

create policy "installation_photos_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'installation-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Política de inserção para usuários autenticados
create policy "installation_photos_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'installation-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Política de delete para dono do arquivo
-- Path do arquivo: installation-photos/{user_id}/{file_name}
create policy "installation_photos_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'installation-photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Política de update para dono do arquivo (necessária para upsert)
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
