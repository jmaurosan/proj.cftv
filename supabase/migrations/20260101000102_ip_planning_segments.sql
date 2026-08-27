BEGIN;

ALTER TABLE public.network_segments
  ADD COLUMN IF NOT EXISTS dhcp_start_ip text,
  ADD COLUMN IF NOT EXISTS dhcp_end_ip text;

ALTER TABLE public.network_segments DROP CONSTRAINT IF EXISTS network_segments_vlan_id_check;
ALTER TABLE public.network_segments ADD CONSTRAINT network_segments_vlan_id_check
  CHECK (vlan_id IS NULL OR vlan_id BETWEEN 1 AND 4094);

CREATE INDEX IF NOT EXISTS network_segments_client_network_idx
  ON public.network_segments(client_id, network_ip);

INSERT INTO public.app_schema_releases (version, description)
VALUES ('2026.08.25.3', 'Plano global de IP, sub-redes, VLAN e faixa DHCP')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

COMMIT;
