-- ============================================
-- Migration: QR Code de câmeras
-- Adiciona coluna qr_code_url e cria bucket de storage
-- ============================================

-- Adiciona coluna para URL da foto do QR code
alter table cameras add column if not exists qr_code_url text;

-- ============================================
-- Bucket para fotos de QR code
-- ============================================

-- Cria bucket (executar no console SQL do Supabase com autenticação de serviço)
insert into storage.buckets (id, name, public)
values ('qr-codes', 'qr-codes', false)
on conflict (id) do nothing;

update storage.buckets
set public = false
where id = 'qr-codes';

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

-- Política de inserção para usuários autenticados
-- Precisa criar função para obter o user_id do JWT
-- Função simplificada - qualquer usuário autenticado pode fazer upload

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

-- Política de delete para dono do arquivo
-- Armazenamos o user_id no path do arquivo: qr-codes/{user_id}/{file_name}
create policy "qr_codes_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'qr-codes'
    and split_part(name, '/', 1) = auth.uid()::text
  );
