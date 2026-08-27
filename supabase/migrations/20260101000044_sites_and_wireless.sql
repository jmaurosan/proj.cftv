-- ============================================================
-- Fase 2 — Sites (elevadores, blocos) + roteador AP/Cliente + link wireless
-- ============================================================
-- Aditivo puro. NÃO altera dados nem colunas existentes.
--
-- Escopo:
--   1. Cria installation_sites (locais físicos hierárquicos)
--   2. Adiciona routers.mode + routers.paired_router_id + routers.site_id
--      + routers.powered_by_poe_injector
--   3. Adiciona cameras.site_id
--   4. Indexes, RLS multi-tenant, triggers
--
-- Uso típico:
--   Site "Elevador Social Direito" (site_type=elevador_social)
--     - Router "AP poço"     mode=ap        site_id=...  paired_router_id=<Cliente>
--     - Router "Cliente cab" mode=client    site_id=...  paired_router_id=<AP>
--     - Camera IP na cabine                 site_id=...
-- ============================================================

-- ------------------------------------------------------------
-- 1. installation_sites — locais físicos (com hierarquia)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS installation_sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name            VARCHAR(120) NOT NULL,
  site_type       VARCHAR(30) NOT NULL DEFAULT 'outro'
                  CHECK (site_type IN (
                    'elevador_social', 'elevador_servico', 'elevador_panoramico',
                    'bloco', 'pavimento', 'guarita', 'portaria',
                    'estacionamento', 'area_comum', 'ext_externo', 'outro'
                  )),

  -- Hierarquia opcional: "Bloco A" > "Elevador 1"
  parent_site_id  UUID REFERENCES installation_sites(id) ON DELETE SET NULL,

  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installation_sites_client  ON installation_sites(client_id);
CREATE INDEX IF NOT EXISTS idx_installation_sites_parent  ON installation_sites(parent_site_id) WHERE parent_site_id IS NOT NULL;

-- ------------------------------------------------------------
-- 2. routers — novas colunas
-- ------------------------------------------------------------
-- mode: função do roteador na topologia
--   router = roteador tradicional (default, retrocompatível)
--   ap     = access point servindo o link P2P
--   client = cliente do link P2P
--   bridge = ponte L2 (sem PPPoE/NAT)
--   wisp   = ponto de acesso externo tipo WISP
--   other  = escape
ALTER TABLE routers
  ADD COLUMN IF NOT EXISTS mode VARCHAR(20) NOT NULL DEFAULT 'router';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'routers' AND constraint_name = 'routers_mode_check'
  ) THEN
    ALTER TABLE routers
      ADD CONSTRAINT routers_mode_check
      CHECK (mode IN ('router', 'ap', 'client', 'bridge', 'wisp', 'other'));
  END IF;
END $$;

ALTER TABLE routers
  ADD COLUMN IF NOT EXISTS paired_router_id UUID REFERENCES routers(id) ON DELETE SET NULL;

ALTER TABLE routers
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES installation_sites(id) ON DELETE SET NULL;

ALTER TABLE routers
  ADD COLUMN IF NOT EXISTS powered_by_poe_injector BOOLEAN NOT NULL DEFAULT FALSE;

-- Impede um roteador de se auto-pareamento
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'routers' AND constraint_name = 'routers_no_self_pairing'
  ) THEN
    ALTER TABLE routers
      ADD CONSTRAINT routers_no_self_pairing
      CHECK (paired_router_id IS NULL OR paired_router_id <> id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_routers_paired ON routers(paired_router_id) WHERE paired_router_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routers_site   ON routers(site_id)          WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routers_mode   ON routers(mode)             WHERE mode <> 'router';

-- ------------------------------------------------------------
-- 3. cameras — vínculo com site
-- ------------------------------------------------------------
ALTER TABLE cameras
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES installation_sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cameras_site ON cameras(site_id) WHERE site_id IS NOT NULL;

-- ------------------------------------------------------------
-- 4. RLS + policies (padrão multi-tenant do projeto)
-- ------------------------------------------------------------
ALTER TABLE installation_sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sites_select ON installation_sites;
CREATE POLICY sites_select ON installation_sites
  FOR SELECT
  USING (user_has_client_access(client_id) OR is_admin());

DROP POLICY IF EXISTS sites_insert ON installation_sites;
CREATE POLICY sites_insert ON installation_sites
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (user_has_client_access(client_id) OR is_admin())
  );

DROP POLICY IF EXISTS sites_update ON installation_sites;
CREATE POLICY sites_update ON installation_sites
  FOR UPDATE
  USING (user_has_client_access(client_id) OR is_admin())
  WITH CHECK (user_has_client_access(client_id) OR is_admin());

DROP POLICY IF EXISTS sites_delete ON installation_sites;
CREATE POLICY sites_delete ON installation_sites
  FOR DELETE
  USING (user_has_client_access(client_id) OR is_admin());

-- ------------------------------------------------------------
-- 5. Trigger updated_at
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS installation_sites_updated_at ON installation_sites;
CREATE TRIGGER installation_sites_updated_at
  BEFORE UPDATE ON installation_sites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 6. Comentários (documentação in-schema)
-- ------------------------------------------------------------
COMMENT ON TABLE  installation_sites                 IS 'Locais físicos hierárquicos (elevadores, blocos, guarita, etc.) para agrupar câmeras e roteadores na topologia.';
COMMENT ON COLUMN installation_sites.site_type       IS 'Categoria do local. Usado para ícone/agrupamento visual na topologia e relatórios.';
COMMENT ON COLUMN installation_sites.parent_site_id  IS 'Site pai opcional (ex: "Bloco A" contém "Elevador 1" e "Elevador 2").';

COMMENT ON COLUMN routers.mode                       IS 'Função do roteador: router (padrão), ap, client, bridge, wisp, other. AP + Client formam um link wireless P2P via paired_router_id.';
COMMENT ON COLUMN routers.paired_router_id           IS 'Roteador par no mesmo link wireless. Vínculo mantido bidirecional pela aplicação.';
COMMENT ON COLUMN routers.site_id                    IS 'Site onde o roteador está fisicamente instalado.';
COMMENT ON COLUMN routers.powered_by_poe_injector    IS 'Roteador é alimentado por injetor PoE (comum em elevadores e links wireless externos).';

COMMENT ON COLUMN cameras.site_id                    IS 'Site físico onde a câmera está instalada. Permite agrupar câmeras por elevador/bloco na topologia.';
