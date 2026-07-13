-- Racks independentes da topologia e monitores do projeto.
-- Compatível: os dados legados continuam preservados em clients.notes.
create table if not exists public.racks (
  id uuid primary key default gen_random_uuid(),
  topology_id text not null,
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text not null default 'Rack técnico',
  equipment_ids text[] not null default '{}',
  has_nobreak boolean not null default false,
  power_notes text,
  cable_notes text,
  media_paths text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, topology_id)
);

create table if not exists public.monitors (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rack_id uuid references public.racks(id) on delete set null,
  name text not null,
  brand text not null,
  model text not null,
  power_watts numeric(10,2) check (power_watts is null or power_watts >= 0),
  input_voltage text not null,
  location text,
  serial_number text,
  status text not null default 'ativo',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_racks_client_id on public.racks(client_id);
create index if not exists idx_monitors_client_id on public.monitors(client_id);
create index if not exists idx_monitors_rack_id on public.monitors(rack_id);

alter table public.racks enable row level security;
alter table public.monitors enable row level security;

drop policy if exists racks_owner_all on public.racks;
create policy racks_owner_all on public.racks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists monitors_owner_all on public.monitors;
create policy monitors_owner_all on public.monitors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists racks_touch_updated_at on public.racks;
create trigger racks_touch_updated_at before update on public.racks for each row execute function public.touch_updated_at();
drop trigger if exists monitors_touch_updated_at on public.monitors;
create trigger monitors_touch_updated_at before update on public.monitors for each row execute function public.touch_updated_at();

