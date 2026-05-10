-- Adiciona coluna 'brand' na tabela cameras
-- Execute no projeto CFTV do Supabase

alter table cameras add column if not exists brand varchar(100);

comment on column cameras.brand is 'Marca da câmera (ex: Intelbras, Hikvision)';