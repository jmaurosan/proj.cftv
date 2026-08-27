-- Consumo eletrico por equipamento. Watts informado tem prioridade sobre V x A.

BEGIN;

ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS power_watts numeric(10,2) CHECK (power_watts IS NULL OR power_watts >= 0);

ALTER TABLE public.dvrs
  ADD COLUMN IF NOT EXISTS power_watts numeric(10,2) CHECK (power_watts IS NULL OR power_watts >= 0),
  ADD COLUMN IF NOT EXISTS operating_voltage text,
  ADD COLUMN IF NOT EXISTS current_consumption_a numeric(10,3) CHECK (current_consumption_a IS NULL OR current_consumption_a >= 0);

ALTER TABLE public.switches
  ADD COLUMN IF NOT EXISTS power_watts numeric(10,2) CHECK (power_watts IS NULL OR power_watts >= 0),
  ADD COLUMN IF NOT EXISTS operating_voltage text,
  ADD COLUMN IF NOT EXISTS current_consumption_a numeric(10,3) CHECK (current_consumption_a IS NULL OR current_consumption_a >= 0);

ALTER TABLE public.power_baluns
  ADD COLUMN IF NOT EXISTS power_watts numeric(10,2) CHECK (power_watts IS NULL OR power_watts >= 0),
  ADD COLUMN IF NOT EXISTS operating_voltage text,
  ADD COLUMN IF NOT EXISTS current_consumption_a numeric(10,3) CHECK (current_consumption_a IS NULL OR current_consumption_a >= 0);

ALTER TABLE public.routers
  ADD COLUMN IF NOT EXISTS power_watts numeric(10,2) CHECK (power_watts IS NULL OR power_watts >= 0),
  ADD COLUMN IF NOT EXISTS operating_voltage text,
  ADD COLUMN IF NOT EXISTS current_consumption_a numeric(10,3) CHECK (current_consumption_a IS NULL OR current_consumption_a >= 0);

INSERT INTO public.app_schema_releases (version, description)
VALUES ('2026.08.24.5', 'Consumo eletrico por equipamento com calculo W = V x A')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

COMMIT;
