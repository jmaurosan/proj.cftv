BEGIN;

CREATE TABLE IF NOT EXISTS public.network_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  access_mode text NOT NULL CHECK (access_mode IN ('local', 'wireguard')),
  agent_hostname text,
  total_devices integer NOT NULL DEFAULT 0 CHECK (total_devices >= 0),
  online_devices integer NOT NULL DEFAULT 0 CHECK (online_devices >= 0),
  offline_devices integer NOT NULL DEFAULT 0 CHECK (offline_devices >= 0),
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS network_diagnostics_client_created_idx
  ON public.network_diagnostics(client_id, created_at DESC);

ALTER TABLE public.network_diagnostics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS network_diagnostics_select ON public.network_diagnostics;
CREATE POLICY network_diagnostics_select ON public.network_diagnostics
  FOR SELECT TO authenticated
  USING (public.user_has_client_role(client_id, ARRAY['owner','operator','viewer']));

DROP POLICY IF EXISTS network_diagnostics_insert ON public.network_diagnostics;
CREATE POLICY network_diagnostics_insert ON public.network_diagnostics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_has_client_role(client_id, ARRAY['owner','operator']));

GRANT SELECT, INSERT ON public.network_diagnostics TO authenticated;

INSERT INTO public.app_schema_releases (version, description)
VALUES ('2026.08.24.6', 'Diagnostico tecnico de rede via agente local e WireGuard')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

COMMIT;
