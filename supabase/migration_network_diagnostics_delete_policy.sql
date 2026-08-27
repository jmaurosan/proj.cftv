BEGIN;

DROP POLICY IF EXISTS network_diagnostics_delete ON public.network_diagnostics;
CREATE POLICY network_diagnostics_delete ON public.network_diagnostics
  FOR DELETE TO authenticated
  USING (public.user_has_client_role(client_id, ARRAY['owner','operator']));

GRANT DELETE ON public.network_diagnostics TO authenticated;

INSERT INTO public.app_schema_releases (version, description)
VALUES ('2026.08.25.1', 'Historico consultavel e exclusao autorizada de diagnosticos de rede')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

COMMIT;
