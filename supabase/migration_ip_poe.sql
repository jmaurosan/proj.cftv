-- ============================================
-- Migração: Suporte a Câmeras IP + Switches PoE
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1) Switches: adicionar campos PoE
alter table switches add column if not exists is_poe boolean not null default false;
alter table switches add column if not exists poe_standard varchar(20);
alter table switches add column if not exists poe_budget_watts numeric(6,1);

-- 2) Cameras: adicionar tipo de conexão e campos IP
alter table cameras add column if not exists connection_type varchar(20) not null default 'analogica';
alter table cameras add column if not exists ip_address varchar(45);
alter table cameras add column if not exists mac_address varchar(17);
alter table cameras add column if not exists poe_powered boolean not null default false;

-- 3) Cameras: tornar dvr_id e channel_number opcionais (câmera IP não precisa de DVR)
alter table cameras alter column dvr_id drop not null;
alter table cameras alter column channel_number drop not null;

-- 4) Recriar constraint unique para permitir NULL no dvr_id
-- A constraint antiga era: uq_cameras_dvr_channel on (dvr_id, channel_number)
-- No PostgreSQL, NULL != NULL, então a constraint já permite múltiplos NULLs
-- Não precisa recriar, mas vamos garantir com um índice parcial adequado
drop index if exists uq_cameras_dvr_channel;

-- Para câmeras analógicas: dvr_id + channel_number devem ser únicos
create unique index uq_cameras_dvr_channel on cameras(dvr_id, channel_number)
  where dvr_id is not null;

-- Para câmeras IP: ip_address deve ser único por usuário
create unique index uq_cameras_ip_user on cameras(user_id, ip_address)
  where ip_address is not null;

-- 5) Índice para filtrar por tipo de conexão
create index idx_cameras_connection_type on cameras(connection_type);
