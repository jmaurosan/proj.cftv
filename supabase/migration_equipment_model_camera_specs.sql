-- Campos técnicos para catálogo de modelos de câmera.
-- Permite preencher automaticamente lente, IR, tensão e corrente ao escolher um modelo.

ALTER TABLE public.equipment_models
  ADD COLUMN IF NOT EXISTS lens_type TEXT,
  ADD COLUMN IF NOT EXISTS ir_distance_meters NUMERIC,
  ADD COLUMN IF NOT EXISTS operating_voltage TEXT,
  ADD COLUMN IF NOT EXISTS current_consumption_a NUMERIC;

ALTER TABLE public.equipment_models
  DROP CONSTRAINT IF EXISTS equipment_models_model_not_blank;

ALTER TABLE public.equipment_models
  ADD CONSTRAINT equipment_models_model_not_blank CHECK (length(trim(model)) > 0);
