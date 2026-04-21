-- ============================================
-- Migration: Conexões de portas de Baluns e Switches
-- Armazena o que está conectado em cada porta
-- ============================================

-- Tabela: balun_ports (conexões de cada porta do power balun)
create table if not exists balun_ports (
  id uuid primary key default gen_random_uuid(),
  balun_id uuid not null references power_baluns(id) on delete cascade,
  port_number int not null,
  camera_id uuid references cameras(id) on delete set null,
  notes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(balun_id, port_number)
);

create index if not exists idx_balun_ports_balun on balun_ports(balun_id);
create index if not exists idx_balun_ports_camera on balun_ports(camera_id);

alter table balun_ports enable row level security;

create policy "balun_ports_select" on balun_ports for select using (auth.uid() = user_id);
create policy "balun_ports_insert" on balun_ports for insert with check (auth.uid() = user_id);
create policy "balun_ports_update" on balun_ports for update using (auth.uid() = user_id);
create policy "balun_ports_delete" on balun_ports for delete using (auth.uid() = user_id);

create trigger balun_ports_updated_at
  before update on balun_ports
  for each row execute function set_updated_at();

-- Tabela: switch_ports (conexões de cada porta do switch)
create table if not exists switch_ports (
  id uuid primary key default gen_random_uuid(),
  switch_id uuid not null references switches(id) on delete cascade,
  port_number int not null,
  device_type varchar(20), -- camera, dvr, balun, switch, other
  device_id uuid,
  device_name varchar(200),
  notes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(switch_id, port_number)
);

create index if not exists idx_switch_ports_switch on switch_ports(switch_id);
create index if not exists idx_switch_ports_device on switch_ports(device_type, device_id);

alter table switch_ports enable row level security;

create policy "switch_ports_select" on switch_ports for select using (auth.uid() = user_id);
create policy "switch_ports_insert" on switch_ports for insert with check (auth.uid() = user_id);
create policy "switch_ports_update" on switch_ports for update using (auth.uid() = user_id);
create policy "switch_ports_delete" on switch_ports for delete using (auth.uid() = user_id);

create trigger switch_ports_updated_at
  before update on switch_ports
  for each row execute function set_updated_at();
