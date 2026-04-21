-- ============================================
-- Migration: Campo marca em cameras + tabela de auditoria
-- ============================================

-- Adiciona campo marca (brand) nas cameras
alter table cameras add column if not exists brand varchar(100);

-- Adiciona campo marca (brand) nos DVRs
alter table dvrs add column if not exists brand varchar(100);

-- Adiciona campo marca (brand) nos switches
alter table switches add column if not exists brand varchar(100);

-- ============================================
-- Tabela de auditoria/histórico de equipamentos
-- ============================================

create table if not exists equipment_logs (
  id uuid primary key default gen_random_uuid(),
  equipment_type varchar(20) not null, -- camera, dvr, balun, switch, credential
  equipment_id uuid,
  action varchar(10) not null, -- created, updated, deleted
  equipment_name varchar(200),
  details jsonb, -- dados extras: marca, modelo, localizacao, etc
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_equipment_logs_user on equipment_logs(user_id);
create index if not exists idx_equipment_logs_type on equipment_logs(equipment_type);
create index if not exists idx_equipment_logs_action on equipment_logs(action);
create index if not exists idx_equipment_logs_created on equipment_logs(created_at);

alter table equipment_logs enable row level security;

create policy if not exists "equipment_logs_select" on equipment_logs for select using (auth.uid() = user_id);
create policy if not exists "equipment_logs_insert" on equipment_logs for insert with check (auth.uid() = user_id);

-- Trigger function para log automatico de cameras
create or replace function log_camera_changes()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into equipment_logs (equipment_type, equipment_id, action, equipment_name, details, user_id)
    values ('camera', new.id, 'created', new.name, jsonb_build_object('brand', new.brand, 'location', new.location, 'type', new.type), new.user_id);
    return new;
  elsif tg_op = 'UPDATE' then
    insert into equipment_logs (equipment_type, equipment_id, action, equipment_name, details, user_id)
    values ('camera', new.id, 'updated', new.name, jsonb_build_object('brand', new.brand, 'location', new.location), new.user_id);
    return new;
  elsif tg_op = 'DELETE' then
    insert into equipment_logs (equipment_type, equipment_id, action, equipment_name, details, user_id)
    values ('camera', old.id, 'deleted', old.name, null, old.user_id);
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Trigger para cameras
drop trigger if exists camera_audit_trigger on cameras;
create trigger camera_audit_trigger
  after insert or update or delete on cameras
  for each row execute function log_camera_changes();

-- Trigger function para dvrs
create or replace function log_dvr_changes()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into equipment_logs (equipment_type, equipment_id, action, equipment_name, details, user_id)
    values ('dvr', new.id, 'created', new.name, jsonb_build_object('brand', new.brand, 'location', new.location), new.user_id);
    return new;
  elsif tg_op = 'UPDATE' then
    insert into equipment_logs (equipment_type, equipment_id, action, equipment_name, details, user_id)
    values ('dvr', new.id, 'updated', new.name, jsonb_build_object('brand', new.brand), new.user_id);
    return new;
  elsif tg_op = 'DELETE' then
    insert into equipment_logs (equipment_type, equipment_id, action, equipment_name, details, user_id)
    values ('dvr', old.id, 'deleted', old.name, null, old.user_id);
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists dvr_audit_trigger on dvrs;
create trigger dvr_audit_trigger
  after insert or update or delete on dvrs
  for each row execute function log_dvr_changes();

-- Trigger function para baluns
create or replace function log_balun_changes()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into equipment_logs (equipment_type, equipment_id, action, equipment_name, details, user_id)
    values ('balun', new.id, 'created', new.name, jsonb_build_object('location', new.location, 'ports', new.total_ports), new.user_id);
    return new;
  elsif tg_op = 'UPDATE' then
    insert into equipment_logs (equipment_type, equipment_id, action, equipment_name, details, user_id)
    values ('balun', new.id, 'updated', new.name, jsonb_build_object('ports', new.total_ports), new.user_id);
    return new;
  elsif tg_op = 'DELETE' then
    insert into equipment_logs (equipment_type, equipment_id, action, equipment_name, details, user_id)
    values ('balun', old.id, 'deleted', old.name, null, old.user_id);
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists balun_audit_trigger on power_baluns;
create trigger balun_audit_trigger
  after insert or update or delete on power_baluns
  for each row execute function log_balun_changes();

-- Trigger function para switches
create or replace function log_switch_changes()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into equipment_logs (equipment_type, equipment_id, action, equipment_name, details, user_id)
    values ('switch', new.id, 'created', new.name, jsonb_build_object('brand', new.brand, 'location', new.location, 'ports', new.total_ports), new.user_id);
    return new;
  elsif tg_op = 'UPDATE' then
    insert into equipment_logs (equipment_type, equipment_id, action, equipment_name, details, user_id)
    values ('switch', new.id, 'updated', new.name, jsonb_build_object('brand', new.brand), new.user_id);
    return new;
  elsif tg_op = 'DELETE' then
    insert into equipment_logs (equipment_type, equipment_id, action, equipment_name, details, user_id)
    values ('switch', old.id, 'deleted', old.name, null, old.user_id);
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists switch_audit_trigger on switches;
create trigger switch_audit_trigger
  after insert or update or delete on switches
  for each row execute function log_switch_changes();
