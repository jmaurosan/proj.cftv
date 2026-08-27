-- ============================================================
-- Multi-Tenant Fase 1 — Aditivo puro
-- ============================================================
-- Não altera nenhum comportamento existente. Cria estrutura pra
-- Fase 2 (policies v2) e Fase 3 (swap). Seguro rodar em produção.
--
-- O que faz:
--   1. Cria funções helpers is_admin() e user_has_client_access()
--   2. Cria client_members (user, client, role) com suas policies
--   3. Adiciona coluna client_id nas 6 tabelas que só têm user_id
--   4. Faz backfill de client_id via relacionamento parent
--   5. Popula client_members com mauromonit@gmail.com em todos clients
--   6. Marca mauromonit@gmail.com como admin via app_metadata
--
-- O que NÃO faz:
--   - Não altera nenhuma policy existente
--   - Não modifica RLS de nenhuma tabela pré-existente
--   - equipment_models fica como catálogo compartilhado (sem client_id)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Funções helper (criadas ANTES das policies que as usam)
-- ------------------------------------------------------------

-- Admin flag lido do JWT app_metadata (setado em auth.users.raw_app_meta_data).
-- Não usa raw_user_meta_data porque essa é editável pelo próprio user
-- via API — app_metadata só via service_role.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ------------------------------------------------------------
-- 2. Tabela de membership: user → client → role
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_members (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'operator', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_members_user ON client_members(user_id);
CREATE INDEX IF NOT EXISTS idx_client_members_client ON client_members(client_id);

ALTER TABLE client_members ENABLE ROW LEVEL SECURITY;

-- Policies (idempotente via DROP + CREATE)
DROP POLICY IF EXISTS cm_select ON client_members;
CREATE POLICY cm_select ON client_members
  FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS cm_write ON client_members;
CREATE POLICY cm_write ON client_members
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ------------------------------------------------------------
-- 3. user_has_client_access() — SECURITY DEFINER bypassa RLS de
--    client_members quando outras policies chamam esta função,
--    evitando recursão infinita
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION user_has_client_access(cid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM client_members
    WHERE user_id = auth.uid() AND client_id = cid
  );
$$;

-- ------------------------------------------------------------
-- 4. Adicionar client_id nas 6 tabelas que só têm user_id
-- ------------------------------------------------------------
-- (equipment_models fica sem client_id — é catálogo compartilhado)

ALTER TABLE balun_4x1_outputs
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE balun_ports
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE camera_installation_photos
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE dvr_channels
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE switch_ports
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- ------------------------------------------------------------
-- 5. Backfill de client_id via relacionamento parent
-- ------------------------------------------------------------

UPDATE balun_4x1_outputs bo
SET client_id = pb.client_id
FROM power_baluns pb
WHERE bo.balun_id = pb.id
  AND bo.client_id IS NULL;

UPDATE balun_ports bp
SET client_id = pb.client_id
FROM power_baluns pb
WHERE bp.balun_id = pb.id
  AND bp.client_id IS NULL;

UPDATE camera_installation_photos cip
SET client_id = c.client_id
FROM cameras c
WHERE cip.camera_id = c.id
  AND cip.client_id IS NULL;

UPDATE dvr_channels dc
SET client_id = d.client_id
FROM dvrs d
WHERE dc.dvr_id = d.id
  AND dc.client_id IS NULL;

UPDATE switch_ports sp
SET client_id = s.client_id
FROM switches s
WHERE sp.switch_id = s.id
  AND sp.client_id IS NULL;

-- Sanity check: quantas linhas ficaram sem client_id após backfill?
DO $$
DECLARE
  orphans INTEGER := 0;
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'balun_4x1_outputs','balun_ports','camera_installation_photos',
    'dvr_channels','switch_ports'
  ])
  LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE client_id IS NULL', t) INTO orphans;
    IF orphans > 0 THEN
      RAISE NOTICE 'Tabela % tem % linha(s) orfa(s) (client_id NULL apos backfill)', t, orphans;
    END IF;
  END LOOP;
END $$;

-- Índices em client_id pra policies performáticas
CREATE INDEX IF NOT EXISTS idx_balun_4x1_outputs_client ON balun_4x1_outputs(client_id);
CREATE INDEX IF NOT EXISTS idx_balun_ports_client ON balun_ports(client_id);
CREATE INDEX IF NOT EXISTS idx_camera_installation_photos_client ON camera_installation_photos(client_id);
CREATE INDEX IF NOT EXISTS idx_dvr_channels_client ON dvr_channels(client_id);
CREATE INDEX IF NOT EXISTS idx_switch_ports_client ON switch_ports(client_id);

-- ------------------------------------------------------------
-- 6. Popular client_members: mauromonit → todos os clients existentes
-- ------------------------------------------------------------
INSERT INTO client_members (user_id, client_id, role)
SELECT
  'cf45d049-bf1b-443c-b4a3-e71853f4818b'::uuid,
  id,
  'owner'
FROM clients
ON CONFLICT (user_id, client_id) DO NOTHING;

-- ------------------------------------------------------------
-- 7. Marcar mauromonit@gmail.com como admin
-- ------------------------------------------------------------
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE id = 'cf45d049-bf1b-443c-b4a3-e71853f4818b';
