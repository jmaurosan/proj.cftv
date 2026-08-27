-- Campos opcionais para garantia, validade e dimensionamento elétrico.
-- Aplicar no Supabase antes ou logo após o deploy.

alter table public.cameras
  add column if not exists model text,
  add column if not exists lens_type text,
  add column if not exists serial_number text,
  add column if not exists installation_date date,
  add column if not exists operating_voltage text,
  add column if not exists current_consumption_a numeric;

alter table public.dvrs
  add column if not exists serial_number text,
  add column if not exists installation_date date;

alter table public.switches
  add column if not exists serial_number text,
  add column if not exists installation_date date;

alter table public.power_baluns
  add column if not exists serial_number text,
  add column if not exists installation_date date;

alter table public.routers
  add column if not exists serial_number text,
  add column if not exists installation_date date;

create index if not exists idx_cameras_installation_date on public.cameras(installation_date);
create index if not exists idx_dvrs_installation_date on public.dvrs(installation_date);
create index if not exists idx_switches_installation_date on public.switches(installation_date);
create index if not exists idx_power_baluns_installation_date on public.power_baluns(installation_date);
create index if not exists idx_routers_installation_date on public.routers(installation_date);
