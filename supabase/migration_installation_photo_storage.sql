-- ============================================
-- Migration: Foto do local de instalação da câmera
-- Adiciona coluna installation_photo_url e cria bucket de storage
-- ============================================

-- Adiciona coluna para URL da foto do local de instalação
alter table cameras add column if not exists installation_photo_url text;

-- ============================================
-- Bucket para fotos do local de instalação
-- ============================================

-- Cria bucket público
insert into storage.buckets (id, name, public)
values ('installation-photos', 'installation-photos', true)
on conflict (id) do nothing;

-- ============================================
-- Policies (Postgres não suporta CREATE POLICY IF NOT EXISTS,
-- então usamos DROP POLICY IF EXISTS antes de cada CREATE)
-- ============================================

-- Política de leitura pública
drop policy if exists "installation_photos_public_read" on storage.objects;
create policy "installation_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'installation-photos');

-- Política de inserção para usuários autenticados
drop policy if exists "installation_photos_insert" on storage.objects;
create policy "installation_photos_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'installation-photos'
    and auth.role() = 'authenticated'
  );

-- Política de delete para dono do arquivo
-- Path do arquivo: installation-photos/{user_id}/{file_name}
drop policy if exists "installation_photos_delete" on storage.objects;
create policy "installation_photos_delete"
  on storage.objects for delete
  using (
    bucket_id = 'installation-photos'
    and auth.uid() = split_part(name, '/', 1)::uuid
  );

-- Política de update para dono do arquivo (necessária para upsert)
drop policy if exists "installation_photos_update" on storage.objects;
create policy "installation_photos_update"
  on storage.objects for update
  using (
    bucket_id = 'installation-photos'
    and auth.uid() = split_part(name, '/', 1)::uuid
  );
