-- ============================================================
-- Fase 1 — Cabos UTP compartilhados + cabo paralelo de alimentação
-- ============================================================
-- Aditivo puro. NÃO altera nem remove nada existente.
-- Preserva 100% dos dados atuais de cable_connections via cópia.
--
-- Escopo:
--   1. Cria utp_cables (cabo mestre, pode servir 1 ou até 4 câmeras)
--   2. Cria utp_cable_pairs (4 linhas por cabo, uma por par)
--   3. Cria power_cables (cabo paralelo de alimentação)
--   4. Cria power_cable_cameras (M2M câmeras alimentadas por 1 cabo)
--   5. Indexes, RLS multi-tenant (client_id + user_has_client_access), triggers
--   6. Data migration idempotente: cada cable_connections vira 1 utp_cable + 4 pares
--      (e um power_cable extra quando has_external_power = TRUE)
--
-- Compat: cable_connections continua intacto — é rede de segurança.
-- Um migration futuro (após validação) irá aposentá-lo.
-- Regra fundamental: total de pares por cabo UTP = 4 (garantido por
-- unique (cable_id, pair_number) + check constraint).
-- ============================================================

-- ------------------------------------------------------------
-- 1. utp_cables — cabo UTP mestre (compartilhado ou dedicado)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS utp_cables (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name                  VARCHAR(120),
  cable_type            VARCHAR(30) NOT NULL,
  wiring_standard       VARCHAR(30),
  custom_color_order    TEXT,

  cable_length_meters   NUMERIC(6,1),

  has_splice            BOOLEAN NOT NULL DEFAULT FALSE,
  splice_location       VARCHAR(200),
  splice_notes          TEXT,

  notes                 TEXT,

  -- Rastreabilidade da migração (nullable — cabos novos não têm origem legada)
  legacy_cable_id       UUID UNIQUE REFERENCES cable_connections(id) ON DELETE SET NULL,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_utp_cables_client   ON utp_cables(client_id);
CREATE INDEX IF NOT EXISTS idx_utp_cables_user     ON utp_cables(user_id);

-- ------------------------------------------------------------
-- 2. utp_cable_pairs — 4 pares por cabo, cada um com função
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS utp_cable_pairs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cable_id      UUID NOT NULL REFERENCES utp_cables(id) ON DELETE CASCADE,
  pair_number   SMALLINT NOT NULL CHECK (pair_number BETWEEN 1 AND 4),

  function      VARCHAR(20) NOT NULL DEFAULT 'nao_utilizado'
                CHECK (function IN ('video','alimentacao','dados','nao_utilizado')),

  -- Só preenchido quando function='video' — cada par de vídeo aponta pra 1 câmera
  camera_id     UUID REFERENCES cameras(id) ON DELETE SET NULL,

  wire1_color   VARCHAR(30),
  wire2_color   VARCHAR(30),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (cable_id, pair_number)
);

CREATE INDEX IF NOT EXISTS idx_utp_cable_pairs_cable   ON utp_cable_pairs(cable_id);
CREATE INDEX IF NOT EXISTS idx_utp_cable_pairs_camera  ON utp_cable_pairs(camera_id) WHERE camera_id IS NOT NULL;

-- Regra: câmera de vídeo é única por par (não permitir 2 câmeras no mesmo par)
-- Regra derivada: câmera pode aparecer em N cabos, mas nunca 2x no mesmo cabo como vídeo
CREATE UNIQUE INDEX IF NOT EXISTS uidx_utp_cable_pairs_cable_camera_video
  ON utp_cable_pairs(cable_id, camera_id)
  WHERE camera_id IS NOT NULL AND function = 'video';

-- ------------------------------------------------------------
-- 3. power_cables — cabo paralelo de alimentação (fora do UTP)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS power_cables (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name                  VARCHAR(120) NOT NULL,
  wire_gauge_mm2        NUMERIC(4,2),          -- 1.5, 2.5, 4.0, 6.0…
  voltage               VARCHAR(10),           -- 12V, 24V
  cable_length_meters   NUMERIC(6,1),
  power_source_info     TEXT,                  -- Marca/modelo da fonte

  notes                 TEXT,

  legacy_cable_id       UUID REFERENCES cable_connections(id) ON DELETE SET NULL,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_power_cables_client ON power_cables(client_id);
CREATE INDEX IF NOT EXISTS idx_power_cables_user   ON power_cables(user_id);

-- ------------------------------------------------------------
-- 4. power_cable_cameras — M2M câmera x cabo paralelo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS power_cable_cameras (
  power_cable_id  UUID NOT NULL REFERENCES power_cables(id) ON DELETE CASCADE,
  camera_id       UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (power_cable_id, camera_id)
);

CREATE INDEX IF NOT EXISTS idx_power_cable_cameras_camera ON power_cable_cameras(camera_id);

-- ------------------------------------------------------------
-- 5. RLS + policies (padrão multi-tenant já usado no projeto)
-- ------------------------------------------------------------

-- utp_cables
ALTER TABLE utp_cables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS utp_cables_select ON utp_cables;
CREATE POLICY utp_cables_select ON utp_cables
  FOR SELECT
  USING (user_has_client_access(client_id) OR is_admin());

DROP POLICY IF EXISTS utp_cables_insert ON utp_cables;
CREATE POLICY utp_cables_insert ON utp_cables
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (user_has_client_access(client_id) OR is_admin())
  );

DROP POLICY IF EXISTS utp_cables_update ON utp_cables;
CREATE POLICY utp_cables_update ON utp_cables
  FOR UPDATE
  USING (user_has_client_access(client_id) OR is_admin())
  WITH CHECK (user_has_client_access(client_id) OR is_admin());

DROP POLICY IF EXISTS utp_cables_delete ON utp_cables;
CREATE POLICY utp_cables_delete ON utp_cables
  FOR DELETE
  USING (user_has_client_access(client_id) OR is_admin());

-- utp_cable_pairs (RLS herda via cable_id → utp_cables.client_id)
ALTER TABLE utp_cable_pairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS utp_cable_pairs_select ON utp_cable_pairs;
CREATE POLICY utp_cable_pairs_select ON utp_cable_pairs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM utp_cables c
      WHERE c.id = utp_cable_pairs.cable_id
        AND (user_has_client_access(c.client_id) OR is_admin())
    )
  );

DROP POLICY IF EXISTS utp_cable_pairs_insert ON utp_cable_pairs;
CREATE POLICY utp_cable_pairs_insert ON utp_cable_pairs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM utp_cables c
      WHERE c.id = utp_cable_pairs.cable_id
        AND (user_has_client_access(c.client_id) OR is_admin())
    )
  );

DROP POLICY IF EXISTS utp_cable_pairs_update ON utp_cable_pairs;
CREATE POLICY utp_cable_pairs_update ON utp_cable_pairs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM utp_cables c
      WHERE c.id = utp_cable_pairs.cable_id
        AND (user_has_client_access(c.client_id) OR is_admin())
    )
  );

DROP POLICY IF EXISTS utp_cable_pairs_delete ON utp_cable_pairs;
CREATE POLICY utp_cable_pairs_delete ON utp_cable_pairs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM utp_cables c
      WHERE c.id = utp_cable_pairs.cable_id
        AND (user_has_client_access(c.client_id) OR is_admin())
    )
  );

-- power_cables
ALTER TABLE power_cables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS power_cables_select ON power_cables;
CREATE POLICY power_cables_select ON power_cables
  FOR SELECT
  USING (user_has_client_access(client_id) OR is_admin());

DROP POLICY IF EXISTS power_cables_insert ON power_cables;
CREATE POLICY power_cables_insert ON power_cables
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (user_has_client_access(client_id) OR is_admin())
  );

DROP POLICY IF EXISTS power_cables_update ON power_cables;
CREATE POLICY power_cables_update ON power_cables
  FOR UPDATE
  USING (user_has_client_access(client_id) OR is_admin())
  WITH CHECK (user_has_client_access(client_id) OR is_admin());

DROP POLICY IF EXISTS power_cables_delete ON power_cables;
CREATE POLICY power_cables_delete ON power_cables
  FOR DELETE
  USING (user_has_client_access(client_id) OR is_admin());

-- power_cable_cameras (RLS herda via power_cable_id)
ALTER TABLE power_cable_cameras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS power_cable_cameras_select ON power_cable_cameras;
CREATE POLICY power_cable_cameras_select ON power_cable_cameras
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM power_cables p
      WHERE p.id = power_cable_cameras.power_cable_id
        AND (user_has_client_access(p.client_id) OR is_admin())
    )
  );

DROP POLICY IF EXISTS power_cable_cameras_insert ON power_cable_cameras;
CREATE POLICY power_cable_cameras_insert ON power_cable_cameras
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM power_cables p
      WHERE p.id = power_cable_cameras.power_cable_id
        AND (user_has_client_access(p.client_id) OR is_admin())
    )
  );

DROP POLICY IF EXISTS power_cable_cameras_delete ON power_cable_cameras;
CREATE POLICY power_cable_cameras_delete ON power_cable_cameras
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM power_cables p
      WHERE p.id = power_cable_cameras.power_cable_id
        AND (user_has_client_access(p.client_id) OR is_admin())
    )
  );

-- ------------------------------------------------------------
-- 6. Triggers de updated_at (reusa set_updated_at() existente)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS utp_cables_updated_at ON utp_cables;
CREATE TRIGGER utp_cables_updated_at
  BEFORE UPDATE ON utp_cables
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS utp_cable_pairs_updated_at ON utp_cable_pairs;
CREATE TRIGGER utp_cable_pairs_updated_at
  BEFORE UPDATE ON utp_cable_pairs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS power_cables_updated_at ON power_cables;
CREATE TRIGGER power_cables_updated_at
  BEFORE UPDATE ON power_cables
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 7. Data migration idempotente — cable_connections → utp_cables
-- ------------------------------------------------------------
-- Re-executar este bloco é seguro (WHERE NOT EXISTS via legacy_cable_id).
-- Só migra registros que já têm client_id (populado no multi_tenant_01_additive).

-- 7.1 Cria 1 utp_cable por cable_connection (herda user_id, client_id, timestamps)
INSERT INTO utp_cables (
  id, client_id, user_id, name,
  cable_type, wiring_standard, custom_color_order,
  cable_length_meters, has_splice, splice_location, splice_notes, notes,
  legacy_cable_id, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  cc.client_id,
  cc.user_id,
  NULL,                          -- dedicado: nome fica em branco
  cc.cable_type,
  cc.wiring_standard,
  cc.custom_color_order,
  cc.cable_length_meters,
  cc.has_splice,
  cc.splice_location,
  cc.splice_notes,
  cc.notes,
  cc.id,
  cc.created_at,
  cc.updated_at
FROM cable_connections cc
WHERE cc.client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM utp_cables u WHERE u.legacy_cable_id = cc.id
  );

-- 7.2 Cria os 4 pares por cabo, quebrando "Azul / Branco-Azul" em wire1/wire2
--     Vídeo aponta pra câmera; demais funções ficam com camera_id NULL
INSERT INTO utp_cable_pairs (cable_id, pair_number, function, camera_id, wire1_color, wire2_color)
SELECT
  u.id, 1, cc.pair1_function,
  CASE WHEN cc.pair1_function = 'video' THEN cc.camera_id ELSE NULL END,
  NULLIF(TRIM(SPLIT_PART(cc.pair1_colors, ' / ', 1)), ''),
  NULLIF(TRIM(SPLIT_PART(cc.pair1_colors, ' / ', 2)), '')
FROM utp_cables u
JOIN cable_connections cc ON cc.id = u.legacy_cable_id
WHERE NOT EXISTS (
  SELECT 1 FROM utp_cable_pairs p WHERE p.cable_id = u.id AND p.pair_number = 1
);

INSERT INTO utp_cable_pairs (cable_id, pair_number, function, camera_id, wire1_color, wire2_color)
SELECT
  u.id, 2, cc.pair2_function,
  CASE WHEN cc.pair2_function = 'video' THEN cc.camera_id ELSE NULL END,
  NULLIF(TRIM(SPLIT_PART(cc.pair2_colors, ' / ', 1)), ''),
  NULLIF(TRIM(SPLIT_PART(cc.pair2_colors, ' / ', 2)), '')
FROM utp_cables u
JOIN cable_connections cc ON cc.id = u.legacy_cable_id
WHERE NOT EXISTS (
  SELECT 1 FROM utp_cable_pairs p WHERE p.cable_id = u.id AND p.pair_number = 2
);

INSERT INTO utp_cable_pairs (cable_id, pair_number, function, camera_id, wire1_color, wire2_color)
SELECT
  u.id, 3, cc.pair3_function,
  CASE WHEN cc.pair3_function = 'video' THEN cc.camera_id ELSE NULL END,
  NULLIF(TRIM(SPLIT_PART(cc.pair3_colors, ' / ', 1)), ''),
  NULLIF(TRIM(SPLIT_PART(cc.pair3_colors, ' / ', 2)), '')
FROM utp_cables u
JOIN cable_connections cc ON cc.id = u.legacy_cable_id
WHERE NOT EXISTS (
  SELECT 1 FROM utp_cable_pairs p WHERE p.cable_id = u.id AND p.pair_number = 3
);

INSERT INTO utp_cable_pairs (cable_id, pair_number, function, camera_id, wire1_color, wire2_color)
SELECT
  u.id, 4, cc.pair4_function,
  CASE WHEN cc.pair4_function = 'video' THEN cc.camera_id ELSE NULL END,
  NULLIF(TRIM(SPLIT_PART(cc.pair4_colors, ' / ', 1)), ''),
  NULLIF(TRIM(SPLIT_PART(cc.pair4_colors, ' / ', 2)), '')
FROM utp_cables u
JOIN cable_connections cc ON cc.id = u.legacy_cable_id
WHERE NOT EXISTS (
  SELECT 1 FROM utp_cable_pairs p WHERE p.cable_id = u.id AND p.pair_number = 4
);

-- 7.3 Para cable_connections com has_external_power=TRUE cria 1 power_cable
--     e vincula a câmera correspondente
INSERT INTO power_cables (
  id, client_id, user_id, name,
  wire_gauge_mm2, voltage, cable_length_meters, power_source_info, notes,
  legacy_cable_id, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  cc.client_id,
  cc.user_id,
  COALESCE('Alimentação — ' || c.name, 'Alimentação externa (migrada)'),
  NULL,                     -- bitola/tensão desconhecidas na origem
  NULL,
  NULL,
  cc.power_source_info,
  NULL,
  cc.id,
  cc.created_at,
  cc.updated_at
FROM cable_connections cc
JOIN cameras c ON c.id = cc.camera_id
WHERE cc.has_external_power = TRUE
  AND cc.client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM power_cables p WHERE p.legacy_cable_id = cc.id
  );

INSERT INTO power_cable_cameras (power_cable_id, camera_id)
SELECT p.id, cc.camera_id
FROM power_cables p
JOIN cable_connections cc ON cc.id = p.legacy_cable_id
WHERE NOT EXISTS (
  SELECT 1 FROM power_cable_cameras pcc
  WHERE pcc.power_cable_id = p.id AND pcc.camera_id = cc.camera_id
);

-- ------------------------------------------------------------
-- 8. Comentários (documentação in-schema)
-- ------------------------------------------------------------
COMMENT ON TABLE  utp_cables             IS 'Cabo UTP mestre. Pode ser dedicado a 1 câmera ou compartilhado por até 4 (1 par de vídeo por câmera).';
COMMENT ON COLUMN utp_cables.name        IS 'Rótulo opcional. Use quando o cabo for compartilhado (ex: "Tronco estacionamento").';
COMMENT ON COLUMN utp_cables.legacy_cable_id IS 'FK para cable_connections. Preenchido apenas em cabos migrados; NULL em cabos novos.';

COMMENT ON TABLE  utp_cable_pairs        IS 'Um dos 4 pares de um cabo UTP. Exatamente 4 linhas por cabo (pair_number 1-4).';
COMMENT ON COLUMN utp_cable_pairs.function IS 'video | alimentacao | dados | nao_utilizado. Só video usa camera_id.';
COMMENT ON COLUMN utp_cable_pairs.camera_id IS 'Câmera atendida por este par (só quando function=video). Máx 1 câmera por par.';

COMMENT ON TABLE  power_cables           IS 'Cabo paralelo de alimentação (fora do UTP). Alimenta 1 ou mais câmeras via power_cable_cameras.';
COMMENT ON TABLE  power_cable_cameras    IS 'M2M câmera x cabo paralelo de alimentação. Uma câmera pode receber energia de 1 ou mais cabos.';
