-- ============================================
-- Migration: Sistema de Clientes/Projetos
-- Adiciona isolamento por cliente em todas as tabelas
-- ============================================

-- ============================================
-- Tabela: clients (Clientes/Projetos)
-- ============================================
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name varchar(200) not null,
  contact_name varchar(100),
  contact_phone varchar(20),
  contact_email varchar(100),
  address text,
  city varchar(100),
  state varchar(2),
  notes text,
  is_active boolean not null default true,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clients_user_id on clients(user_id);
create index if not exists idx_clients_active on clients(is_active);
create unique index if not exists idx_clients_name_user on clients(user_id, name);

alter table clients enable row level security;

create policy "clients_select" on clients for select using (auth.uid() = user_id);
create policy "clients_insert" on clients for insert with check (auth.uid() = user_id);
create policy "clients_update" on clients for update using (auth.uid() = user_id);
create policy "clients_delete" on clients for delete using (auth.uid() = user_id);

create trigger clients_updated_at
  before update on clients
  for each row execute function set_updated_at();

-- ============================================
-- Adiciona client_id nas tabelas existentes
-- ============================================

-- Tabela: dvrs
alter table dvrs add column if not exists client_id uuid references clients(id) on delete cascade;
create index if not exists idx_dvrs_client_id on dvrs(client_id);

-- Tabela: power_baluns
alter table power_baluns add column if not exists client_id uuid references clients(id) on delete cascade;
create index if not exists idx_baluns_client_id on power_baluns(client_id);

-- Tabela: switches
alter table switches add column if not exists client_id uuid references clients(id) on delete cascade;
create index if not exists idx_switches_client_id on switches(client_id);

-- Tabela: cameras
alter table cameras add column if not exists client_id uuid references clients(id) on delete cascade;
create index if not exists idx_cameras_client_id on cameras(client_id);

-- Tabela: credentials
alter table credentials add column if not exists client_id uuid references clients(id) on delete cascade;
create index if not exists idx_credentials_client_id on credentials(client_id);

-- Tabela: cable_connections
alter table cable_connections add column if not exists client_id uuid references clients(id) on delete cascade;
create index if not exists idx_cable_client_id on cable_connections(client_id);

-- ============================================
-- Atualiza RLS policies para considerar client_id (opcional - mantém apenas user_id para simplicidade)
-- O isolamento é feito via aplicacao, nao via RLS, para permitir flexibilidade
-- ============================================

-- Comentario: As policies RLS existentes (por user_id) sao mantidas.
-- O filtro por cliente sera aplicado na aplicacao React via query params.
-- Isso permite que o usuario veja todos os seus equipamentos, mas filtre por cliente quando desejado.
