-- Verificacao somente leitura. Este arquivo nao cria nem altera objetos.

SELECT public.current_app_schema_version() AS schema_version;

SELECT
  required.item,
  required.is_ready
FROM (
  VALUES
    ('client_members', to_regclass('public.client_members') IS NOT NULL),
    ('user_has_client_role', to_regprocedure('public.user_has_client_role(uuid,text[])') IS NOT NULL),
    ('reveal_credential_secret', to_regprocedure('public.reveal_credential_secret(uuid)') IS NOT NULL),
    ('move_camera_to_dvr_channel', to_regprocedure('public.move_camera_to_dvr_channel(uuid,uuid,integer)') IS NOT NULL),
    ('set_camera_balun_port', to_regprocedure('public.set_camera_balun_port(uuid,integer,uuid,boolean,text)') IS NOT NULL),
    ('set_camera_switch_port', to_regprocedure('public.set_camera_switch_port(uuid,integer,uuid,boolean,text)') IS NOT NULL),
    ('diagnose_camera_connection_integrity', to_regprocedure('public.diagnose_camera_connection_integrity(uuid)') IS NOT NULL),
    ('app_schema_releases', to_regclass('public.app_schema_releases') IS NOT NULL)
) AS required(item, is_ready)
ORDER BY required.item;

SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('cameras', 'dvrs', 'switches', 'power_baluns', 'credentials')
ORDER BY tablename, cmd, policyname;

SELECT
  has_function_privilege('authenticated', 'public.current_app_schema_version()', 'EXECUTE') AS authenticated_can_read_version,
  has_function_privilege('authenticated', 'public.move_camera_to_dvr_channel(uuid,uuid,integer)', 'EXECUTE') AS authenticated_can_move_camera,
  has_table_privilege('authenticated', 'public.app_schema_releases', 'INSERT') AS authenticated_can_insert_release;
