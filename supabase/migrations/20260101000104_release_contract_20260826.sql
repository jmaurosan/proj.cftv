-- Contrato minimo do aplicativo CFTV.PROJ em 2026.08.26.4.
-- Falha sem alterar nada quando uma migration obrigatoria estiver ausente.

BEGIN;

DO $$
DECLARE
  missing_items text[] := ARRAY[]::text[];
BEGIN
  IF to_regclass('public.app_schema_releases') IS NULL THEN
    missing_items := array_append(missing_items, 'app_schema_releases');
  END IF;
  IF to_regclass('public.installation_site_types') IS NULL THEN
    missing_items := array_append(missing_items, 'installation_site_types');
  END IF;
  IF to_regclass('public.network_diagnostics') IS NULL THEN
    missing_items := array_append(missing_items, 'network_diagnostics');
  END IF;
  IF to_regclass('public.equipment_commissioning') IS NULL THEN
    missing_items := array_append(missing_items, 'equipment_commissioning');
  END IF;
  IF to_regclass('public.maintenance_records') IS NULL THEN
    missing_items := array_append(missing_items, 'maintenance_records');
  END IF;
  IF to_regprocedure('public.user_has_client_role(uuid,text[])') IS NULL THEN
    missing_items := array_append(missing_items, 'user_has_client_role');
  END IF;
  IF to_regprocedure('public.reveal_credential_secret(uuid)') IS NULL THEN
    missing_items := array_append(missing_items, 'reveal_credential_secret');
  END IF;
  IF to_regprocedure('public.update_camera_connections(uuid,uuid,integer,uuid,integer,uuid,integer)') IS NULL THEN
    missing_items := array_append(missing_items, 'update_camera_connections');
  END IF;
  IF to_regprocedure('public.set_camera_balun_port(uuid,integer,uuid,boolean,text)') IS NULL THEN
    missing_items := array_append(missing_items, 'set_camera_balun_port');
  END IF;
  IF to_regprocedure('public.set_camera_switch_port(uuid,integer,uuid,boolean,text)') IS NULL THEN
    missing_items := array_append(missing_items, 'set_camera_switch_port');
  END IF;
  IF to_regprocedure('public.diagnose_camera_connection_integrity(uuid)') IS NULL THEN
    missing_items := array_append(missing_items, 'diagnose_camera_connection_integrity');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cameras' AND column_name='power_watts') THEN
    missing_items := array_append(missing_items, 'cameras.power_watts');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cameras' AND column_name='recording_codec') THEN
    missing_items := array_append(missing_items, 'cameras.recording_codec');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='credentials' AND column_name='serial_number') THEN
    missing_items := array_append(missing_items, 'credentials.serial_number');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='network_segments' AND column_name='dhcp_start_ip') THEN
    missing_items := array_append(missing_items, 'network_segments.dhcp_start_ip');
  END IF;

  IF cardinality(missing_items) > 0 THEN
    RAISE EXCEPTION 'Contrato 2026.08.26.4 incompleto. Ausente: %', array_to_string(missing_items, ', ');
  END IF;
END $$;

INSERT INTO public.app_schema_releases (version, description)
VALUES ('2026.08.26.4', 'Contrato minimo verificavel, portas de camera transacionais e bloqueio de schemas incompletos')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

CREATE OR REPLACE FUNCTION public.current_app_schema_version()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT version
  FROM public.app_schema_releases
  ORDER BY string_to_array(version, '.')::int[] DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_app_schema_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_schema_version() TO authenticated;

COMMIT;
