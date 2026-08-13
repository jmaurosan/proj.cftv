-- ============================================================
-- Fase A — DVR: separar canais analógicos de canais IP
-- ============================================================
-- Aditivo puro. Backfill preserva 100% dos DVRs e câmeras existentes.
--
-- Motivação:
--   DVRs Hikvision e Intelbras têm pools SEPARADOS para BNC e IP.
--   Modelo antigo usava total_channels único, o que permitia colisões
--   semânticas (câmera IP em canal analógico e vice-versa).
--
-- Regra de numeração adotada: CONTÍNUA (padrão Hikvision Live View).
--   Analógicos ocupam [1 .. analog_channels]
--   IPs        ocupam [analog_channels+1 .. analog_channels+ip_channels]
--
-- Compat:
--   - total_channels continua existindo (não drop) e será mantido = analog + ip
--   - Câmeras existentes continuam com channel_number válido
--   - Nenhum uso quebra
-- ============================================================

-- 1. Colunas novas
ALTER TABLE dvrs
  ADD COLUMN IF NOT EXISTS analog_channels SMALLINT;

ALTER TABLE dvrs
  ADD COLUMN IF NOT EXISTS ip_channels SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE dvrs
  ADD COLUMN IF NOT EXISTS operation_mode VARCHAR(20) NOT NULL DEFAULT 'hybrid';

-- 2. Constraint de modo de operação
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'dvrs' AND constraint_name = 'dvrs_operation_mode_check'
  ) THEN
    ALTER TABLE dvrs
      ADD CONSTRAINT dvrs_operation_mode_check
      CHECK (operation_mode IN ('hybrid', 'nvr', 'dvr_only'));
  END IF;
END $$;

-- 3. Constraint de sanidade nos valores
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'dvrs' AND constraint_name = 'dvrs_channels_non_negative'
  ) THEN
    ALTER TABLE dvrs
      ADD CONSTRAINT dvrs_channels_non_negative
      CHECK (
        (analog_channels IS NULL OR analog_channels >= 0)
        AND ip_channels >= 0
      );
  END IF;
END $$;

-- 4. Backfill: assume tudo analógico (comportamento retrocompatível)
UPDATE dvrs
SET analog_channels = total_channels
WHERE analog_channels IS NULL;

-- 5. Após backfill, torna analog_channels NOT NULL
ALTER TABLE dvrs
  ALTER COLUMN analog_channels SET NOT NULL;

-- 6. Mantém total_channels sincronizado via trigger
--    (garantia caso alguém escreva analog/ip mas esqueça de atualizar total)
CREATE OR REPLACE FUNCTION dvr_sync_total_channels()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.total_channels := COALESCE(NEW.analog_channels, 0) + COALESCE(NEW.ip_channels, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dvr_sync_total_channels_trigger ON dvrs;
CREATE TRIGGER dvr_sync_total_channels_trigger
  BEFORE INSERT OR UPDATE OF analog_channels, ip_channels ON dvrs
  FOR EACH ROW EXECUTE FUNCTION dvr_sync_total_channels();

-- 7. Comentários
COMMENT ON COLUMN dvrs.analog_channels IS 'Canais BNC (analógicos). Ocupam a faixa [1 .. analog_channels].';
COMMENT ON COLUMN dvrs.ip_channels     IS 'Canais IP extras. Ocupam a faixa [analog_channels+1 .. analog_channels+ip_channels].';
COMMENT ON COLUMN dvrs.operation_mode  IS 'hybrid: BNC + IP; nvr: só IP (todos os canais são IP); dvr_only: só BNC.';
COMMENT ON COLUMN dvrs.total_channels  IS 'Calculado automaticamente como analog_channels + ip_channels (trigger).';
