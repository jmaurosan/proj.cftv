-- ============================================================
-- Multi-tenant Fase 4 — autorizacao por funcao
-- Requer as fases 1 a 3 aplicadas.
--
-- owner    : leitura, cadastro, alteracao e exclusao
-- operator : leitura, cadastro e alteracao
-- viewer   : somente leitura de dados nao secretos
-- admin    : acesso integral
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.user_client_role(cid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT cm.role
  FROM public.client_members cm
  WHERE cm.user_id = auth.uid()
    AND cm.client_id = cid
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_has_client_role(cid uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_admin()
    OR COALESCE(public.user_client_role(cid) = ANY(allowed_roles), false);
$$;

REVOKE ALL ON FUNCTION public.user_client_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_client_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_client_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_client_role(uuid, text[]) TO authenticated;

-- Remove policies permissivas anteriores. Policies PostgreSQL sao combinadas
-- com OR; portanto manter uma policy antiga aberta anularia a matriz por funcao.
DO $$
DECLARE
  target_table text;
  policy_record record;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'dvrs', 'cameras', 'switches', 'power_baluns', 'routers',
    'cable_connections', 'credentials', 'internet_connections',
    'network_segments', 'device_backups', 'monitors', 'racks',
    'balun_4x1_outputs', 'balun_ports', 'camera_installation_photos',
    'dvr_channels', 'switch_ports'
  ]
  LOOP
    FOR policy_record IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, target_table);
    END LOOP;
  END LOOP;
END $$;

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'dvrs', 'cameras', 'switches', 'power_baluns', 'routers',
    'cable_connections', 'internet_connections', 'network_segments',
    'device_backups', 'monitors', 'racks', 'balun_4x1_outputs',
    'balun_ports', 'camera_installation_photos', 'dvr_channels', 'switch_ports'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (public.user_has_client_role(client_id, ARRAY[''owner'',''operator'',''viewer'']))',
      target_table || '_role_select', target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.user_has_client_role(client_id, ARRAY[''owner'',''operator'']))',
      target_table || '_role_insert', target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (public.user_has_client_role(client_id, ARRAY[''owner'',''operator''])) WITH CHECK (public.user_has_client_role(client_id, ARRAY[''owner'',''operator'']))',
      target_table || '_role_update', target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (public.user_has_client_role(client_id, ARRAY[''owner'']))',
      target_table || '_role_delete', target_table
    );
  END LOOP;
END $$;

-- Credenciais ainda contem segredos recuperaveis. Viewer nao recebe a linha;
-- uma visualizacao mascarada sera fornecida por uma fronteira server-side.
CREATE POLICY credentials_role_select ON public.credentials FOR SELECT
  USING (public.user_has_client_role(client_id, ARRAY['owner','operator']));
CREATE POLICY credentials_role_insert ON public.credentials FOR INSERT
  WITH CHECK (public.user_has_client_role(client_id, ARRAY['owner','operator']));
CREATE POLICY credentials_role_update ON public.credentials FOR UPDATE
  USING (public.user_has_client_role(client_id, ARRAY['owner','operator']))
  WITH CHECK (public.user_has_client_role(client_id, ARRAY['owner','operator']));
CREATE POLICY credentials_role_delete ON public.credentials FOR DELETE
  USING (public.user_has_client_role(client_id, ARRAY['owner']));

COMMIT;
