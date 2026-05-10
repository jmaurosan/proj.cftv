-- ============================================
-- Migration: Adicionar colunas 'brand' que estão faltando
-- Execute no projeto CFTV do Supabase
-- ============================================

-- cameras - adicionar brand
alter table cameras add column if not exists brand varchar(100);

-- dvrs - adicionar brand
alter table dvrs add column if not exists brand varchar(100);

-- switches - adicionar brand
alter table switches add column if not exists brand varchar(100);

-- Verificar resultado
select 
  'brand_added' as status,
  (select count(*) from information_schema.columns where table_name = 'cameras' and column_name = 'brand') +
  (select count(*) from information_schema.columns where table_name = 'dvrs' and column_name = 'brand') +
  (select count(*) from information_schema.columns where table_name = 'switches' and column_name = 'brand') as total_columns_added;