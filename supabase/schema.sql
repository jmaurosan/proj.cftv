-- ============================================
-- Schema do Sistema de Gestao de CFTV
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Funcao para atualizar updated_at automaticamente
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================
-- Tabela: dvrs
-- ============================================
create table dvrs (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  ip_address varchar(45) not null,
  model varchar(100),
  location varchar(200) not null,
  total_channels smallint not null default 8,
  status varchar(20) not null default 'ativo',
  username varchar(100),
  password varchar(255),
  notes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_dvrs_user_id on dvrs(user_id);
create index idx_dvrs_status on dvrs(status);
create unique index idx_dvrs_ip_user on dvrs(user_id, ip_address);

alter table dvrs enable row level security;

create policy "dvrs_select" on dvrs for select using (auth.uid() = user_id);
create policy "dvrs_insert" on dvrs for insert with check (auth.uid() = user_id);
create policy "dvrs_update" on dvrs for update using (auth.uid() = user_id);
create policy "dvrs_delete" on dvrs for delete using (auth.uid() = user_id);

create trigger dvrs_updated_at
  before update on dvrs
  for each row execute function set_updated_at();

-- ============================================
-- Tabela: power_baluns
-- ============================================
create table power_baluns (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  location varchar(200) not null,
  total_ports smallint not null default 4,
  status varchar(20) not null default 'ativo',
  notes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_baluns_user_id on power_baluns(user_id);
create index idx_baluns_status on power_baluns(status);

alter table power_baluns enable row level security;

create policy "baluns_select" on power_baluns for select using (auth.uid() = user_id);
create policy "baluns_insert" on power_baluns for insert with check (auth.uid() = user_id);
create policy "baluns_update" on power_baluns for update using (auth.uid() = user_id);
create policy "baluns_delete" on power_baluns for delete using (auth.uid() = user_id);

create trigger baluns_updated_at
  before update on power_baluns
  for each row execute function set_updated_at();

-- ============================================
-- Tabela: switches
-- ============================================
create table switches (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  ip_address varchar(45) not null,
  model varchar(100),
  location varchar(200) not null,
  total_ports smallint not null default 8,
  is_poe boolean not null default false,
  poe_standard varchar(20),
  poe_budget_watts numeric(6,1),
  status varchar(20) not null default 'ativo',
  notes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_switches_user_id on switches(user_id);
create index idx_switches_status on switches(status);
create index idx_switches_ip on switches(user_id, ip_address);

alter table switches enable row level security;

create policy "switches_select" on switches for select using (auth.uid() = user_id);
create policy "switches_insert" on switches for insert with check (auth.uid() = user_id);
create policy "switches_update" on switches for update using (auth.uid() = user_id);
create policy "switches_delete" on switches for delete using (auth.uid() = user_id);

create trigger switches_updated_at
  before update on switches
  for each row execute function set_updated_at();

-- ============================================
-- Tabela: cameras
-- ============================================
create table cameras (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  connection_type varchar(20) not null default 'analogica',
  dvr_id uuid references dvrs(id) on delete cascade,
  channel_number smallint,
  ip_address varchar(45),
  mac_address varchar(17),
  poe_powered boolean not null default false,
  location varchar(200) not null,
  type varchar(30) not null default 'dome',
  status varchar(20) not null default 'ativo',
  resolution varchar(20) default '1080p',
  rtsp_url varchar(500),
  balun_id uuid references power_baluns(id) on delete set null,
  balun_port smallint,
  switch_id uuid references switches(id) on delete set null,
  switch_port smallint,
  notes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cameras_user_id on cameras(user_id);
create index idx_cameras_dvr_id on cameras(dvr_id);
create index idx_cameras_status on cameras(status);
create index idx_cameras_connection_type on cameras(connection_type);
create unique index uq_cameras_dvr_channel on cameras(dvr_id, channel_number)
  where dvr_id is not null;
create unique index uq_cameras_ip_user on cameras(user_id, ip_address)
  where ip_address is not null;

alter table cameras enable row level security;

create policy "cameras_select" on cameras for select using (auth.uid() = user_id);
create policy "cameras_insert" on cameras for insert with check (auth.uid() = user_id);
create policy "cameras_update" on cameras for update using (auth.uid() = user_id);
create policy "cameras_delete" on cameras for delete using (auth.uid() = user_id);

create trigger cameras_updated_at
  before update on cameras
  for each row execute function set_updated_at();

-- ============================================
-- Tabela: credentials
-- ============================================
create table credentials (
  id uuid primary key default gen_random_uuid(),
  device_type varchar(20) not null,
  device_id uuid,
  label varchar(100) not null,
  username varchar(100) not null,
  password varchar(255) not null,
  ip_address varchar(45),
  port integer,
  protocol varchar(20) default 'http',
  notes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_credentials_user_id on credentials(user_id);
create index idx_credentials_device_type on credentials(device_type);

alter table credentials enable row level security;

create policy "credentials_select" on credentials for select using (auth.uid() = user_id);
create policy "credentials_insert" on credentials for insert with check (auth.uid() = user_id);
create policy "credentials_update" on credentials for update using (auth.uid() = user_id);
create policy "credentials_delete" on credentials for delete using (auth.uid() = user_id);

create trigger credentials_updated_at
  before update on credentials
  for each row execute function set_updated_at();

-- ============================================
-- Tabela: cable_connections
-- ============================================
create table cable_connections (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid not null references cameras(id) on delete cascade,

  -- Tipo de cabo
  cable_type varchar(30) not null,

  -- Padrao de cores (apenas UTP)
  wiring_standard varchar(20),
  custom_color_order text,

  -- Configuracao dos 4 pares UTP
  pair1_function varchar(20) default 'dados',
  pair1_colors varchar(50) default 'Azul / Branco-Azul',
  pair2_function varchar(20) default 'dados',
  pair2_colors varchar(50) default 'Laranja / Branco-Laranja',
  pair3_function varchar(20) default 'dados',
  pair3_colors varchar(50) default 'Verde / Branco-Verde',
  pair4_function varchar(20) default 'dados',
  pair4_colors varchar(50) default 'Marrom / Branco-Marrom',

  -- Emendas
  has_splice boolean default false,
  splice_location varchar(200),
  splice_notes text,

  -- Alimentacao externa
  has_external_power boolean default false,
  power_source_info text,

  -- Extras
  cable_length_meters numeric(6,1),
  notes text,

  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_cable_camera on cable_connections(camera_id);
create index idx_cable_user_id on cable_connections(user_id);

alter table cable_connections enable row level security;

create policy "cable_select" on cable_connections for select using (auth.uid() = user_id);
create policy "cable_insert" on cable_connections for insert with check (auth.uid() = user_id);
create policy "cable_update" on cable_connections for update using (auth.uid() = user_id);
create policy "cable_delete" on cable_connections for delete using (auth.uid() = user_id);

create trigger cable_updated_at
  before update on cable_connections
  for each row execute function set_updated_at();
