-- ============================================================
-- Fase Ch2 — Conversão individual BNC → IP por canal (v2)
-- ============================================================
-- Aditivo puro. Compatível com estado atual (default = array vazio).
--
-- Motivação:
--   Hikvision Enhanced IP Mode permite DESABILITAR canais BNC
--   específicos para transformá-los em canais IP. Ex: DVR com
--   16 BNC + 2 IP, usuário desabilita BNC 1 e 3 → agora os canais
--   1 e 3 são IP; canal 2 continua BNC.
--
--   Isso NÃO muda o total de canais físicos — apenas o tipo de
--   cada canal individual.
--
-- Regra efetiva de classificação (aplicação):
--   canal ∈ disabled_analog_channels → IP
--   canal ≤ analog_channels          → BNC
--   canal ≤ analog + ip              → IP
--
-- Nota v2: Postgres não permite subqueries em CHECK, então a
-- validação de faixa (x ≤ analog_channels) fica na aplicação.
-- ============================================================

-- 1. Coluna nova
ALTER TABLE dvrs
  ADD COLUMN IF NOT EXISTS disabled_analog_channels SMALLINT[] NOT NULL DEFAULT '{}';

-- 2. Remove eventual constraint antiga da v1 (que falhava com subquery)
ALTER TABLE dvrs
  DROP CONSTRAINT IF EXISTS dvrs_disabled_channels_valid;

-- 3. Comentário (validação de faixa é feita na aplicação)
COMMENT ON COLUMN dvrs.disabled_analog_channels IS
  'Canais BNC (números entre 1 e analog_channels) que foram convertidos em IP via Enhanced IP Mode. Vazio = todos os BNC ativos. Validação de faixa é feita na aplicação.';
