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
values ('qr-codes', 'qr-codes', true)
on conflict (id) do nothing;

-- Política de leitura pública
create policy if not exists "qr_codes_public_read"
  on storage.objects for select
  using (bucket_id = 'qr-codes');

-- Política de inserção para usuários autenticados
-- Precisa criar função para obter o user_id do JWT
-- Função simplificada - qualquer usuário autenticado pode fazer upload

create policy if not exists "qr_codes_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'qr-codes'
    and auth.role() = 'authenticated'
  );

-- Política de delete para dono do arquivo
-- Armazenamos o user_id no path do arquivo: qr-codes/{user_id}/{file_name}
create policy if not exists "qr_codes_delete"
  on storage.objects for delete
  using (
    bucket_id = 'qr-codes'
    and auth.uid() = split_part(name, '/', 1)::uuid
  );
