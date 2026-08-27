-- Dados do Hik-Connect vinculados ao DVR.
-- O QR Code reutiliza o bucket privado "qr-codes", já protegido por usuário.

alter table public.dvrs
  add column if not exists hik_connect_account text,
  add column if not exists hik_connect_password text,
  add column if not exists hik_connect_verification_code text,
  add column if not exists hik_connect_sharing_info text,
  add column if not exists hik_connect_qr_code_url text;

comment on column public.dvrs.hik_connect_account is
  'E-mail, telefone ou usuário da conta Hik-Connect vinculada ao DVR';
comment on column public.dvrs.hik_connect_password is
  'Senha da conta Hik-Connect vinculada ao DVR';
comment on column public.dvrs.hik_connect_verification_code is
  'Código de verificação usado para adicionar ou validar o DVR no Hik-Connect';
comment on column public.dvrs.hik_connect_sharing_info is
  'Responsáveis, permissões e demais informações de compartilhamento do Hik-Connect';
comment on column public.dvrs.hik_connect_qr_code_url is
  'Caminho privado da foto do QR Code do DVR no bucket qr-codes';
