-- Campos de alimentação das câmeras e catálogo de fontes 12V.
-- Execute antes de cadastrar fontes pelo formulário.

ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS power_source_type TEXT,
  ADD COLUMN IF NOT EXISTS power_supply_voltage TEXT,
  ADD COLUMN IF NOT EXISTS power_supply_current_a NUMERIC,
  ADD COLUMN IF NOT EXISTS power_supply_brand TEXT,
  ADD COLUMN IF NOT EXISTS power_supply_model TEXT;

ALTER TABLE public.equipment_models
  DROP CONSTRAINT IF EXISTS equipment_models_type_check;

ALTER TABLE public.equipment_models
  ADD CONSTRAINT equipment_models_type_check
  CHECK (type IN ('camera', 'dvr', 'switch', 'balun', 'router', 'power_supply', 'other'));
