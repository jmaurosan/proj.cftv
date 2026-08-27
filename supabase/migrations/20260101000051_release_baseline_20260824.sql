-- Baseline de producao CFTV.PROJ 2026.08.24.1
-- Execute depois das migrations multi-tenant, credenciais seguras e troca atomica.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_schema_releases (
  version text PRIMARY KEY,
  description text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by uuid DEFAULT auth.uid()
);

ALTER TABLE public.app_schema_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_schema_releases_select ON public.app_schema_releases;
CREATE POLICY app_schema_releases_select ON public.app_schema_releases
  FOR SELECT TO authenticated
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.app_schema_releases FROM authenticated;
GRANT SELECT ON public.app_schema_releases TO authenticated;

DO $$
DECLARE
  missing_items text[] := ARRAY[]::text[];
BEGIN
  IF to_regclass('public.client_members') IS NULL THEN
    missing_items := array_append(missing_items, 'tabela client_members');
  END IF;
  IF to_regclass('public.credentials') IS NULL THEN
    missing_items := array_append(missing_items, 'tabela credentials');
  END IF;
  IF to_regprocedure('public.user_has_client_role(uuid,text[])') IS NULL THEN
    missing_items := array_append(missing_items, 'funcao user_has_client_role');
  END IF;
  IF to_regprocedure('public.reveal_credential_secret(uuid)') IS NULL THEN
    missing_items := array_append(missing_items, 'funcao reveal_credential_secret');
  END IF;
  IF to_regprocedure('public.move_camera_to_dvr_channel(uuid,uuid,integer)') IS NULL THEN
    missing_items := array_append(missing_items, 'funcao move_camera_to_dvr_channel');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'credentials' AND column_name = 'serial_number'
  ) THEN
    missing_items := array_append(missing_items, 'credentials.serial_number');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'credentials' AND column_name = 'verification_code'
  ) THEN
    missing_items := array_append(missing_items, 'credentials.verification_code');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dvrs' AND column_name = 'disabled_analog_channels'
  ) THEN
    missing_items := array_append(missing_items, 'dvrs.disabled_analog_channels');
  END IF;

  IF cardinality(missing_items) > 0 THEN
    RAISE EXCEPTION 'Baseline incompleto. Aplique antes: %', array_to_string(missing_items, ', ');
  END IF;
END $$;

INSERT INTO public.app_schema_releases (version, description)
VALUES (
  '2026.08.24.1',
  'Multi-tenant por funcao, credenciais seguras, Hik-Connect e troca atomica de canais'
)
ON CONFLICT (version) DO UPDATE
SET description = EXCLUDED.description;

CREATE OR REPLACE FUNCTION public.current_app_schema_version()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT version
  FROM public.app_schema_releases
  ORDER BY applied_at DESC, version DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_app_schema_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_schema_version() TO authenticated;

COMMIT;
