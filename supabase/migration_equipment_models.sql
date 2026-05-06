-- ============================================
-- Migration: Catálogo de Modelos de Equipamentos
-- Armazena modelos para reutilização em cadastros
-- ============================================

create table if not exists equipment_models (
  id uuid primary key default gen_random_uuid(),
  type varchar(20) not null check (type in ('camera', 'dvr', 'switch', 'balun', 'router', 'other')),
  brand varchar(100) not null,
  model varchar(100) not null,
  resolution varchar(20),
  channel_count int,
  poe_standard varchar(20),
  max_ports int,
  is_poe boolean default false,
  notes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(type, brand, model, user_id)
);

create index if not exists idx_equipment_models_type on equipment_models(type);
create index if not exists idx_equipment_models_brand on equipment_models(brand);

alter table equipment_models enable row level security;

create policy "equipment_models_select" on equipment_models for select using (auth.uid() = user_id);
create policy "equipment_models_insert" on equipment_models for insert with check (auth.uid() = user_id);
create policy "equipment_models_update" on equipment_models for update using (auth.uid() = user_id);
create policy "equipment_models_delete" on equipment_models for delete using (auth.uid() = user_id);

create trigger equipment_models_updated_at
  before update on equipment_models
  for each row execute function set_updated_at();
