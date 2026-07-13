-- ============================================
-- Migration: Galeria de fotos de instalação por câmera
-- Permite até 3 fotos vinculadas a cada câmera, mantendo compatibilidade
-- com a coluna legada cameras.installation_photo_url.
-- ============================================

create table if not exists public.camera_installation_photos (
  id uuid primary key default gen_random_uuid(),
  camera_id uuid not null references public.cameras(id) on delete cascade,
  storage_path text not null,
  label text,
  sort_order integer not null default 1,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_camera_installation_photos_camera_id
  on public.camera_installation_photos(camera_id, sort_order);

alter table public.camera_installation_photos enable row level security;

drop policy if exists "camera_installation_photos_select" on public.camera_installation_photos;
drop policy if exists "camera_installation_photos_insert" on public.camera_installation_photos;
drop policy if exists "camera_installation_photos_update" on public.camera_installation_photos;
drop policy if exists "camera_installation_photos_delete" on public.camera_installation_photos;

create policy "camera_installation_photos_select"
  on public.camera_installation_photos for select to authenticated
  using (user_id = auth.uid());

create policy "camera_installation_photos_insert"
  on public.camera_installation_photos for insert to authenticated
  with check (user_id = auth.uid());

create policy "camera_installation_photos_update"
  on public.camera_installation_photos for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "camera_installation_photos_delete"
  on public.camera_installation_photos for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.touch_camera_installation_photos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_camera_installation_photos_updated_at on public.camera_installation_photos;
create trigger trg_camera_installation_photos_updated_at
  before update on public.camera_installation_photos
  for each row execute function public.touch_camera_installation_photos_updated_at();
