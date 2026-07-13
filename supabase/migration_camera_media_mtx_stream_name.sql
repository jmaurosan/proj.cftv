alter table public.cameras
  add column if not exists media_mtx_stream_name text;

comment on column public.cameras.media_mtx_stream_name is
  'Nome manual do path/stream usado pelo MediaMTX para visualizacao local da camera.';
