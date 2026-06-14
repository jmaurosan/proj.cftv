-- Permite diferenciar Balun passivo de Power Balun sem alterar os registros atuais.
-- Registros existentes continuam como Power Balun por padrão.

ALTER TABLE public.power_baluns
  ADD COLUMN IF NOT EXISTS balun_type TEXT NOT NULL DEFAULT 'power';

ALTER TABLE public.power_baluns
  DROP CONSTRAINT IF EXISTS power_baluns_balun_type_check;

ALTER TABLE public.power_baluns
  ADD CONSTRAINT power_baluns_balun_type_check
  CHECK (balun_type IN ('passive', 'power'));
