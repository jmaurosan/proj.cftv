-- Teste transacional da matriz owner/operator/viewer.
-- Execute depois de migration_multi_tenant_04_role_permissions.sql.
-- Substitua os UUIDs de exemplo por usuarios de teste existentes em auth.users.

BEGIN;

DO $$
DECLARE
  test_client uuid := '821d6743-8b15-4a42-b24d-2cab834c852e';
  viewer_user uuid := '00000000-0000-0000-0000-000000000088';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = viewer_user) THEN
    RAISE NOTICE 'Usuario viewer de teste nao existe; crie-o antes do teste integrado.';
    RETURN;
  END IF;

  INSERT INTO public.client_members (user_id, client_id, role)
  VALUES (viewer_user, test_client, 'viewer')
  ON CONFLICT (user_id, client_id) DO UPDATE SET role = EXCLUDED.role;
END $$;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"00000000-0000-0000-0000-000000000088","role":"authenticated","app_metadata":{}}';

SELECT public.user_client_role('821d6743-8b15-4a42-b24d-2cab834c852e') AS expected_viewer;
SELECT count(*) >= 0 AS viewer_can_read_cameras FROM public.cameras;
SELECT count(*) = 0 AS viewer_cannot_receive_credentials FROM public.credentials;

DO $$
BEGIN
  IF public.user_has_client_role(
    '821d6743-8b15-4a42-b24d-2cab834c852e',
    ARRAY['owner','operator']
  ) THEN
    RAISE EXCEPTION 'Viewer recebeu permissao de escrita.';
  END IF;
END $$;

ROLLBACK;
