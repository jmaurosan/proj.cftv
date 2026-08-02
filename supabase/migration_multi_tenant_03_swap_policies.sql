-- ============================================================
-- Multi-Tenant Fase 3 — Swap policies (v2 → nome padrão)
-- ============================================================
-- ⚠️  ESTA MIGRATION MUDA COMPORTAMENTO DE RLS EM PRODUÇÃO ⚠️
--
-- Faz DROP das policies antigas (auth.uid() = user_id) e renomeia
-- as _v2 pra nomes padronizados. Após executar:
--   - mauromonit@gmail.com (admin) vê tudo
--   - qualquer user com entrada em client_members vê os dados
--     do(s) client(s) que ele pertence
--   - user sem membership não vê nada (mesmo se criou os dados)
--
-- ⚠️  PRECONDIÇÕES OBRIGATÓRIAS:
--   1. Fase 1 aplicada (client_members populado, mauro é admin)
--   2. Fase 2 aplicada (policies _v2 criadas)
--   3. mauromonit@gmail.com FEZ LOGOUT E LOGIN novamente
--      (pra o JWT dele conter role=admin)
--   4. Backup do banco feito (pg_dump)
--
-- Se quebrar, reverte com:
--   BEGIN;
--     -- recria policies antigas (ver migration_multi_tenant_03_rollback.sql)
--     DROP POLICY <nome_padrao> ON <tabela>;
--   COMMIT;
--
-- Recomendo aplicar UMA TABELA POR VEZ, testando o app entre cada
-- aplicação. Comente/descomente os blocos abaixo conforme avança.
-- ============================================================

-- ------------------------------------------------------------
-- Bloco 1: dvrs
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS dvrs_select ON dvrs;
DROP POLICY IF EXISTS dvrs_insert ON dvrs;
DROP POLICY IF EXISTS dvrs_update ON dvrs;
DROP POLICY IF EXISTS dvrs_delete ON dvrs;
ALTER POLICY dvrs_select_v2 ON dvrs RENAME TO dvrs_select;
ALTER POLICY dvrs_insert_v2 ON dvrs RENAME TO dvrs_insert;
ALTER POLICY dvrs_update_v2 ON dvrs RENAME TO dvrs_update;
ALTER POLICY dvrs_delete_v2 ON dvrs RENAME TO dvrs_delete;
COMMIT;
-- 🔴 CHECKPOINT: teste o Monet no browser. DVRs aparecem? Sim = continua. Não = rollback.

-- ------------------------------------------------------------
-- Bloco 2: cameras
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS cameras_select ON cameras;
DROP POLICY IF EXISTS cameras_insert ON cameras;
DROP POLICY IF EXISTS cameras_update ON cameras;
DROP POLICY IF EXISTS cameras_delete ON cameras;
ALTER POLICY cameras_select_v2 ON cameras RENAME TO cameras_select;
ALTER POLICY cameras_insert_v2 ON cameras RENAME TO cameras_insert;
ALTER POLICY cameras_update_v2 ON cameras RENAME TO cameras_update;
ALTER POLICY cameras_delete_v2 ON cameras RENAME TO cameras_delete;
COMMIT;
-- 🔴 CHECKPOINT: câmeras aparecem?

-- ------------------------------------------------------------
-- Bloco 3: switches
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS switches_select ON switches;
DROP POLICY IF EXISTS switches_insert ON switches;
DROP POLICY IF EXISTS switches_update ON switches;
DROP POLICY IF EXISTS switches_delete ON switches;
ALTER POLICY switches_select_v2 ON switches RENAME TO switches_select;
ALTER POLICY switches_insert_v2 ON switches RENAME TO switches_insert;
ALTER POLICY switches_update_v2 ON switches RENAME TO switches_update;
ALTER POLICY switches_delete_v2 ON switches RENAME TO switches_delete;
COMMIT;
-- 🔴 CHECKPOINT: switches aparecem?

-- ------------------------------------------------------------
-- Bloco 4: power_baluns
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS baluns_select ON power_baluns;
DROP POLICY IF EXISTS baluns_insert ON power_baluns;
DROP POLICY IF EXISTS baluns_update ON power_baluns;
DROP POLICY IF EXISTS baluns_delete ON power_baluns;
ALTER POLICY power_baluns_select_v2 ON power_baluns RENAME TO baluns_select;
ALTER POLICY power_baluns_insert_v2 ON power_baluns RENAME TO baluns_insert;
ALTER POLICY power_baluns_update_v2 ON power_baluns RENAME TO baluns_update;
ALTER POLICY power_baluns_delete_v2 ON power_baluns RENAME TO baluns_delete;
COMMIT;
-- 🔴 CHECKPOINT

-- ------------------------------------------------------------
-- Bloco 5: routers
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS "Users can view own routers" ON routers;
DROP POLICY IF EXISTS "Users can insert own routers" ON routers;
DROP POLICY IF EXISTS "Users can update own routers" ON routers;
DROP POLICY IF EXISTS "Users can delete own routers" ON routers;
ALTER POLICY routers_select_v2 ON routers RENAME TO routers_select;
ALTER POLICY routers_insert_v2 ON routers RENAME TO routers_insert;
ALTER POLICY routers_update_v2 ON routers RENAME TO routers_update;
ALTER POLICY routers_delete_v2 ON routers RENAME TO routers_delete;
COMMIT;
-- 🔴 CHECKPOINT

-- ------------------------------------------------------------
-- Bloco 6: cable_connections
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS cable_select ON cable_connections;
DROP POLICY IF EXISTS cable_insert ON cable_connections;
DROP POLICY IF EXISTS cable_update ON cable_connections;
DROP POLICY IF EXISTS cable_delete ON cable_connections;
ALTER POLICY cable_connections_select_v2 ON cable_connections RENAME TO cable_select;
ALTER POLICY cable_connections_insert_v2 ON cable_connections RENAME TO cable_insert;
ALTER POLICY cable_connections_update_v2 ON cable_connections RENAME TO cable_update;
ALTER POLICY cable_connections_delete_v2 ON cable_connections RENAME TO cable_delete;
COMMIT;
-- 🔴 CHECKPOINT

-- ------------------------------------------------------------
-- Bloco 7: credentials
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS credentials_select ON credentials;
DROP POLICY IF EXISTS credentials_insert ON credentials;
DROP POLICY IF EXISTS credentials_update ON credentials;
DROP POLICY IF EXISTS credentials_delete ON credentials;
ALTER POLICY credentials_select_v2 ON credentials RENAME TO credentials_select;
ALTER POLICY credentials_insert_v2 ON credentials RENAME TO credentials_insert;
ALTER POLICY credentials_update_v2 ON credentials RENAME TO credentials_update;
ALTER POLICY credentials_delete_v2 ON credentials RENAME TO credentials_delete;
COMMIT;
-- 🔴 CHECKPOINT (credenciais são sensíveis — teste com atenção)

-- ------------------------------------------------------------
-- Bloco 8: internet_connections
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS "Users can view own connections" ON internet_connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON internet_connections;
DROP POLICY IF EXISTS "Users can update own connections" ON internet_connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON internet_connections;
ALTER POLICY internet_connections_select_v2 ON internet_connections RENAME TO internet_connections_select;
ALTER POLICY internet_connections_insert_v2 ON internet_connections RENAME TO internet_connections_insert;
ALTER POLICY internet_connections_update_v2 ON internet_connections RENAME TO internet_connections_update;
ALTER POLICY internet_connections_delete_v2 ON internet_connections RENAME TO internet_connections_delete;
COMMIT;

-- ------------------------------------------------------------
-- Bloco 9: network_segments
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS "Users can view own segments" ON network_segments;
DROP POLICY IF EXISTS "Users can insert own segments" ON network_segments;
DROP POLICY IF EXISTS "Users can update own segments" ON network_segments;
DROP POLICY IF EXISTS "Users can delete own segments" ON network_segments;
ALTER POLICY network_segments_select_v2 ON network_segments RENAME TO network_segments_select;
ALTER POLICY network_segments_insert_v2 ON network_segments RENAME TO network_segments_insert;
ALTER POLICY network_segments_update_v2 ON network_segments RENAME TO network_segments_update;
ALTER POLICY network_segments_delete_v2 ON network_segments RENAME TO network_segments_delete;
COMMIT;

-- ------------------------------------------------------------
-- Bloco 10: device_backups
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS "Users can view own device backups" ON device_backups;
DROP POLICY IF EXISTS "Users can insert own device backups" ON device_backups;
DROP POLICY IF EXISTS "Users can update own device backups" ON device_backups;
DROP POLICY IF EXISTS "Users can delete own device backups" ON device_backups;
ALTER POLICY device_backups_select_v2 ON device_backups RENAME TO device_backups_select;
ALTER POLICY device_backups_insert_v2 ON device_backups RENAME TO device_backups_insert;
ALTER POLICY device_backups_update_v2 ON device_backups RENAME TO device_backups_update;
ALTER POLICY device_backups_delete_v2 ON device_backups RENAME TO device_backups_delete;
COMMIT;

-- ------------------------------------------------------------
-- Bloco 11: monitors (era policy única "ALL")
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS monitors_owner_all ON monitors;
ALTER POLICY monitors_select_v2 ON monitors RENAME TO monitors_select;
ALTER POLICY monitors_insert_v2 ON monitors RENAME TO monitors_insert;
ALTER POLICY monitors_update_v2 ON monitors RENAME TO monitors_update;
ALTER POLICY monitors_delete_v2 ON monitors RENAME TO monitors_delete;
COMMIT;

-- ------------------------------------------------------------
-- Bloco 12: racks (era policy única "ALL")
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS racks_owner_all ON racks;
ALTER POLICY racks_select_v2 ON racks RENAME TO racks_select;
ALTER POLICY racks_insert_v2 ON racks RENAME TO racks_insert;
ALTER POLICY racks_update_v2 ON racks RENAME TO racks_update;
ALTER POLICY racks_delete_v2 ON racks RENAME TO racks_delete;
COMMIT;

-- ------------------------------------------------------------
-- Bloco 13: balun_4x1_outputs
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS "Users can view own balun 4x1 outputs" ON balun_4x1_outputs;
DROP POLICY IF EXISTS "Users can insert own balun 4x1 outputs" ON balun_4x1_outputs;
DROP POLICY IF EXISTS "Users can update own balun 4x1 outputs" ON balun_4x1_outputs;
DROP POLICY IF EXISTS "Users can delete own balun 4x1 outputs" ON balun_4x1_outputs;
ALTER POLICY balun_4x1_outputs_select_v2 ON balun_4x1_outputs RENAME TO balun_4x1_outputs_select;
ALTER POLICY balun_4x1_outputs_insert_v2 ON balun_4x1_outputs RENAME TO balun_4x1_outputs_insert;
ALTER POLICY balun_4x1_outputs_update_v2 ON balun_4x1_outputs RENAME TO balun_4x1_outputs_update;
ALTER POLICY balun_4x1_outputs_delete_v2 ON balun_4x1_outputs RENAME TO balun_4x1_outputs_delete;
COMMIT;

-- ------------------------------------------------------------
-- Bloco 14: balun_ports (essa tem 7 policies antigas — duplicadas)
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS "Permitir visualização das portas do balun" ON balun_ports;
DROP POLICY IF EXISTS "Permitir inserir portas do balun" ON balun_ports;
DROP POLICY IF EXISTS "Permitir atualizar portas do balun" ON balun_ports;
DROP POLICY IF EXISTS balun_ports_select ON balun_ports;
DROP POLICY IF EXISTS balun_ports_insert ON balun_ports;
DROP POLICY IF EXISTS balun_ports_update ON balun_ports;
DROP POLICY IF EXISTS balun_ports_delete ON balun_ports;
ALTER POLICY balun_ports_select_v2 ON balun_ports RENAME TO balun_ports_select;
ALTER POLICY balun_ports_insert_v2 ON balun_ports RENAME TO balun_ports_insert;
ALTER POLICY balun_ports_update_v2 ON balun_ports RENAME TO balun_ports_update;
ALTER POLICY balun_ports_delete_v2 ON balun_ports RENAME TO balun_ports_delete;
COMMIT;

-- ------------------------------------------------------------
-- Bloco 15: camera_installation_photos
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS camera_installation_photos_select ON camera_installation_photos;
DROP POLICY IF EXISTS camera_installation_photos_insert ON camera_installation_photos;
DROP POLICY IF EXISTS camera_installation_photos_update ON camera_installation_photos;
DROP POLICY IF EXISTS camera_installation_photos_delete ON camera_installation_photos;
ALTER POLICY camera_installation_photos_select_v2 ON camera_installation_photos RENAME TO camera_installation_photos_select;
ALTER POLICY camera_installation_photos_insert_v2 ON camera_installation_photos RENAME TO camera_installation_photos_insert;
ALTER POLICY camera_installation_photos_update_v2 ON camera_installation_photos RENAME TO camera_installation_photos_update;
ALTER POLICY camera_installation_photos_delete_v2 ON camera_installation_photos RENAME TO camera_installation_photos_delete;
COMMIT;

-- ------------------------------------------------------------
-- Bloco 16: dvr_channels
-- ------------------------------------------------------------
BEGIN;
-- dvr_channels não tem policies antigas (0 rows atualmente, sem policy listada)
ALTER POLICY dvr_channels_select_v2 ON dvr_channels RENAME TO dvr_channels_select;
ALTER POLICY dvr_channels_insert_v2 ON dvr_channels RENAME TO dvr_channels_insert;
ALTER POLICY dvr_channels_update_v2 ON dvr_channels RENAME TO dvr_channels_update;
ALTER POLICY dvr_channels_delete_v2 ON dvr_channels RENAME TO dvr_channels_delete;
COMMIT;

-- ------------------------------------------------------------
-- Bloco 17: switch_ports
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS switch_ports_select ON switch_ports;
DROP POLICY IF EXISTS switch_ports_insert ON switch_ports;
DROP POLICY IF EXISTS switch_ports_update ON switch_ports;
DROP POLICY IF EXISTS switch_ports_delete ON switch_ports;
ALTER POLICY switch_ports_select_v2 ON switch_ports RENAME TO switch_ports_select;
ALTER POLICY switch_ports_insert_v2 ON switch_ports RENAME TO switch_ports_insert;
ALTER POLICY switch_ports_update_v2 ON switch_ports RENAME TO switch_ports_update;
ALTER POLICY switch_ports_delete_v2 ON switch_ports RENAME TO switch_ports_delete;
COMMIT;

-- ------------------------------------------------------------
-- Bloco 18: clients
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS clients_select ON clients;
DROP POLICY IF EXISTS clients_insert ON clients;
DROP POLICY IF EXISTS clients_update ON clients;
DROP POLICY IF EXISTS clients_delete ON clients;
ALTER POLICY clients_select_v2 ON clients RENAME TO clients_select;
ALTER POLICY clients_insert_v2 ON clients RENAME TO clients_insert;
ALTER POLICY clients_update_v2 ON clients RENAME TO clients_update;
ALTER POLICY clients_delete_v2 ON clients RENAME TO clients_delete;
COMMIT;

-- ------------------------------------------------------------
-- Bloco 19: equipment_models
-- ------------------------------------------------------------
BEGIN;
DROP POLICY IF EXISTS equipment_models_select ON equipment_models;
DROP POLICY IF EXISTS equipment_models_insert ON equipment_models;
DROP POLICY IF EXISTS equipment_models_update ON equipment_models;
DROP POLICY IF EXISTS equipment_models_delete ON equipment_models;
ALTER POLICY equipment_models_select_v2 ON equipment_models RENAME TO equipment_models_select;
ALTER POLICY equipment_models_insert_v2 ON equipment_models RENAME TO equipment_models_insert;
ALTER POLICY equipment_models_update_v2 ON equipment_models RENAME TO equipment_models_update;
ALTER POLICY equipment_models_delete_v2 ON equipment_models RENAME TO equipment_models_delete;
COMMIT;

-- ============================================================
-- Verificação final: qualquer _v2 remanescente?
-- ============================================================
-- SELECT tablename, policyname FROM pg_policies
-- WHERE schemaname='public' AND policyname LIKE '%_v2';
-- (deve retornar 0 linhas)
