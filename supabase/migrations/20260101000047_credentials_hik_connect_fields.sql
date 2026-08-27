-- Centraliza o acesso Hik-Connect em credentials sem remover imediatamente
-- as colunas legadas de dvrs. A cópia é idempotente e preserva QR Codes privados.

alter table public.credentials
  add column if not exists serial_number text,
  add column if not exists verification_code text,
  add column if not exists sharing_info text,
  add column if not exists qr_code_url text;

-- Garante compatibilidade quando a migração legada do Hik-Connect ainda não
-- tiver sido aplicada no projeto Supabase.
alter table public.dvrs
  add column if not exists hik_connect_account text,
  add column if not exists hik_connect_password text,
  add column if not exists hik_connect_verification_code text,
  add column if not exists hik_connect_sharing_info text,
  add column if not exists hik_connect_qr_code_url text;

comment on column public.credentials.serial_number is
  'Número de série usado para identificar/adicionar a câmera ou DVR no serviço remoto';
comment on column public.credentials.verification_code is
  'Código de verificação do dispositivo no Hik-Connect';
comment on column public.credentials.sharing_info is
  'Responsáveis, permissões e observações de compartilhamento do acesso';
comment on column public.credentials.qr_code_url is
  'Caminho privado da imagem do QR Code no bucket qr-codes';

insert into public.credentials (
  device_type,
  device_id,
  label,
  username,
  password,
  ip_address,
  port,
  protocol,
  serial_number,
  verification_code,
  sharing_info,
  qr_code_url,
  notes,
  client_id,
  user_id
)
select
  'dvr',
  d.id,
  'Hik-Connect - ' || d.name,
  coalesce(d.hik_connect_account, ''),
  coalesce(d.hik_connect_password, ''),
  nullif(d.ip_address, ''),
  8000,
  'hik_connect',
  d.serial_number,
  d.hik_connect_verification_code,
  d.hik_connect_sharing_info,
  d.hik_connect_qr_code_url,
  'Migrado automaticamente do cadastro do DVR.',
  d.client_id,
  d.user_id
from public.dvrs d
where (
  nullif(d.hik_connect_account, '') is not null
  or nullif(d.hik_connect_password, '') is not null
  or nullif(d.hik_connect_verification_code, '') is not null
  or nullif(d.hik_connect_sharing_info, '') is not null
  or nullif(d.hik_connect_qr_code_url, '') is not null
)
and not exists (
  select 1
  from public.credentials c
  where c.device_type = 'dvr'
    and c.device_id = d.id
    and c.protocol = 'hik_connect'
);

create index if not exists idx_credentials_device_link
  on public.credentials (device_type, device_id)
  where device_id is not null;
