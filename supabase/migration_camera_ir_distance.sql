-- Distância de infravermelho das câmeras, em metros.
-- Aplicar no Supabase para persistir o novo campo do cadastro.

alter table public.cameras
  add column if not exists ir_distance_meters numeric;
