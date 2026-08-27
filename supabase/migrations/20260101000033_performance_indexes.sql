-- Composite indexes for the filters and sorting used by the application.
-- This migration is additive and does not modify existing data.

CREATE INDEX IF NOT EXISTS idx_dvrs_client_created
  ON public.dvrs (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dvrs_client_name
  ON public.dvrs (client_id, name);

CREATE INDEX IF NOT EXISTS idx_cameras_client_created
  ON public.cameras (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cameras_client_name
  ON public.cameras (client_id, name);

CREATE INDEX IF NOT EXISTS idx_switches_client_created
  ON public.switches (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_switches_client_name
  ON public.switches (client_id, name);

CREATE INDEX IF NOT EXISTS idx_baluns_client_created
  ON public.power_baluns (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_baluns_client_name
  ON public.power_baluns (client_id, name);

CREATE INDEX IF NOT EXISTS idx_routers_client_created
  ON public.routers (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routers_client_name
  ON public.routers (client_id, name);

CREATE INDEX IF NOT EXISTS idx_credentials_client_created
  ON public.credentials (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credentials_client_label
  ON public.credentials (client_id, label);

CREATE INDEX IF NOT EXISTS idx_dvr_channels_dvr_number
  ON public.dvr_channels (dvr_id, channel_number);
CREATE INDEX IF NOT EXISTS idx_switch_ports_switch_number
  ON public.switch_ports (switch_id, port_number);
CREATE INDEX IF NOT EXISTS idx_balun_ports_balun_number
  ON public.balun_ports (balun_id, port_number);
