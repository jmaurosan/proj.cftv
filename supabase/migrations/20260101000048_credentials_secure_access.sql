-- Credenciais: listagem mascarada e revelacao auditada.
-- Requer migration_multi_tenant_04_role_permissions.sql.

BEGIN;

-- Compatibilidade com bancos que ainda nao receberam a migracao Hik-Connect.
-- A listagem segura depende desses campos, portanto eles sao garantidos aqui
-- antes da criacao das funcoes.
ALTER TABLE public.credentials
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS verification_code text,
  ADD COLUMN IF NOT EXISTS sharing_info text,
  ADD COLUMN IF NOT EXISTS qr_code_url text;

CREATE TABLE IF NOT EXISTS public.credential_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL REFERENCES public.credentials(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('reveal')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credential_access_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_credential_access_log_client_created
  ON public.credential_access_log(client_id, created_at DESC);

REVOKE ALL ON public.credential_access_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_credentials_safe(p_client_id uuid)
RETURNS TABLE (
  id uuid, device_type text, device_id uuid, label text, username text,
  password text, ip_address text, port integer, protocol text,
  serial_number text, verification_code text, sharing_info text,
  qr_code_url text, notes text, client_id uuid, user_id uuid,
  created_at timestamptz, updated_at timestamptz, secret_available boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT c.id, c.device_type::text, c.device_id, c.label::text, c.username::text,
    ''::text, c.ip_address::text, c.port, c.protocol::text,
    c.serial_number::text, NULL::text, NULL::text,
    c.qr_code_url::text, c.notes::text, c.client_id, c.user_id,
    c.created_at, c.updated_at,
    (COALESCE(c.password, '') <> '' OR COALESCE(c.verification_code, '') <> '' OR COALESCE(c.sharing_info, '') <> '')
  FROM public.credentials c
  WHERE c.client_id = p_client_id
    AND public.user_has_client_role(p_client_id, ARRAY['owner','operator','viewer'])
  ORDER BY c.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.reveal_credential_secret(p_credential_id uuid)
RETURNS TABLE (password text, verification_code text, sharing_info text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_credential public.credentials%ROWTYPE;
BEGIN
  SELECT * INTO selected_credential
  FROM public.credentials
  WHERE id = p_credential_id;

  IF NOT FOUND OR NOT public.user_has_client_role(selected_credential.client_id, ARRAY['owner','operator']) THEN
    RAISE EXCEPTION 'Acesso nao autorizado a credencial.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.credential_access_log(credential_id, client_id, user_id, action)
  VALUES (selected_credential.id, selected_credential.client_id, auth.uid(), 'reveal');

  RETURN QUERY SELECT selected_credential.password::text,
    selected_credential.verification_code::text,
    selected_credential.sharing_info::text;
END;
$$;

REVOKE ALL ON FUNCTION public.list_credentials_safe(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reveal_credential_secret(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_credentials_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_credential_secret(uuid) TO authenticated;

-- Impede select('*') de transportar segredos. As colunas nao secretas seguem
-- disponiveis para UPDATE/DELETE via PostgREST e para compatibilidade gradual.
REVOKE SELECT ON public.credentials FROM authenticated;
GRANT SELECT (
  id, device_type, device_id, label, username, ip_address, port, protocol,
  serial_number, qr_code_url, notes, client_id, user_id, created_at, updated_at
) ON public.credentials TO authenticated;

COMMIT;
