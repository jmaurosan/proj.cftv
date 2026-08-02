-- ============================================================
-- Multi-Tenant Fase 3 — ROLLBACK de emergência
-- ============================================================
-- Se APÓS aplicar migration_multi_tenant_03_swap_policies.sql o
-- app do Monet quebrar, execute este script pra restaurar as
-- policies antigas (auth.uid() = user_id).
--
-- Este rollback DROPa as policies com nomes padronizados (que
-- foram renomeadas de _v2) e recria as antigas com os nomes e
-- predicados originais.
--
-- Após rollback, o app volta ao comportamento "cada user vê o
-- que ele criou". Multi-tenant fica desligado, mas nada é perdido:
--   - client_members continua existindo (não afeta nada)
--   - is_admin() e user_has_client_access() continuam existindo
--   - colunas client_id adicionadas na Fase 1 continuam existindo
--
-- Pra tentar de novo depois, é só re-rodar as migrations 02 e 03.
-- ============================================================

BEGIN;

-- Drop tudo que foi renomeado na Fase 3
DROP POLICY IF EXISTS dvrs_select ON dvrs;
DROP POLICY IF EXISTS dvrs_insert ON dvrs;
DROP POLICY IF EXISTS dvrs_update ON dvrs;
DROP POLICY IF EXISTS dvrs_delete ON dvrs;

DROP POLICY IF EXISTS cameras_select ON cameras;
DROP POLICY IF EXISTS cameras_insert ON cameras;
DROP POLICY IF EXISTS cameras_update ON cameras;
DROP POLICY IF EXISTS cameras_delete ON cameras;

DROP POLICY IF EXISTS switches_select ON switches;
DROP POLICY IF EXISTS switches_insert ON switches;
DROP POLICY IF EXISTS switches_update ON switches;
DROP POLICY IF EXISTS switches_delete ON switches;

DROP POLICY IF EXISTS baluns_select ON power_baluns;
DROP POLICY IF EXISTS baluns_insert ON power_baluns;
DROP POLICY IF EXISTS baluns_update ON power_baluns;
DROP POLICY IF EXISTS baluns_delete ON power_baluns;

DROP POLICY IF EXISTS routers_select ON routers;
DROP POLICY IF EXISTS routers_insert ON routers;
DROP POLICY IF EXISTS routers_update ON routers;
DROP POLICY IF EXISTS routers_delete ON routers;

DROP POLICY IF EXISTS cable_select ON cable_connections;
DROP POLICY IF EXISTS cable_insert ON cable_connections;
DROP POLICY IF EXISTS cable_update ON cable_connections;
DROP POLICY IF EXISTS cable_delete ON cable_connections;

DROP POLICY IF EXISTS credentials_select ON credentials;
DROP POLICY IF EXISTS credentials_insert ON credentials;
DROP POLICY IF EXISTS credentials_update ON credentials;
DROP POLICY IF EXISTS credentials_delete ON credentials;

DROP POLICY IF EXISTS internet_connections_select ON internet_connections;
DROP POLICY IF EXISTS internet_connections_insert ON internet_connections;
DROP POLICY IF EXISTS internet_connections_update ON internet_connections;
DROP POLICY IF EXISTS internet_connections_delete ON internet_connections;

DROP POLICY IF EXISTS network_segments_select ON network_segments;
DROP POLICY IF EXISTS network_segments_insert ON network_segments;
DROP POLICY IF EXISTS network_segments_update ON network_segments;
DROP POLICY IF EXISTS network_segments_delete ON network_segments;

DROP POLICY IF EXISTS device_backups_select ON device_backups;
DROP POLICY IF EXISTS device_backups_insert ON device_backups;
DROP POLICY IF EXISTS device_backups_update ON device_backups;
DROP POLICY IF EXISTS device_backups_delete ON device_backups;

DROP POLICY IF EXISTS monitors_select ON monitors;
DROP POLICY IF EXISTS monitors_insert ON monitors;
DROP POLICY IF EXISTS monitors_update ON monitors;
DROP POLICY IF EXISTS monitors_delete ON monitors;

DROP POLICY IF EXISTS racks_select ON racks;
DROP POLICY IF EXISTS racks_insert ON racks;
DROP POLICY IF EXISTS racks_update ON racks;
DROP POLICY IF EXISTS racks_delete ON racks;

DROP POLICY IF EXISTS balun_4x1_outputs_select ON balun_4x1_outputs;
DROP POLICY IF EXISTS balun_4x1_outputs_insert ON balun_4x1_outputs;
DROP POLICY IF EXISTS balun_4x1_outputs_update ON balun_4x1_outputs;
DROP POLICY IF EXISTS balun_4x1_outputs_delete ON balun_4x1_outputs;

DROP POLICY IF EXISTS balun_ports_select ON balun_ports;
DROP POLICY IF EXISTS balun_ports_insert ON balun_ports;
DROP POLICY IF EXISTS balun_ports_update ON balun_ports;
DROP POLICY IF EXISTS balun_ports_delete ON balun_ports;

DROP POLICY IF EXISTS camera_installation_photos_select ON camera_installation_photos;
DROP POLICY IF EXISTS camera_installation_photos_insert ON camera_installation_photos;
DROP POLICY IF EXISTS camera_installation_photos_update ON camera_installation_photos;
DROP POLICY IF EXISTS camera_installation_photos_delete ON camera_installation_photos;

DROP POLICY IF EXISTS dvr_channels_select ON dvr_channels;
DROP POLICY IF EXISTS dvr_channels_insert ON dvr_channels;
DROP POLICY IF EXISTS dvr_channels_update ON dvr_channels;
DROP POLICY IF EXISTS dvr_channels_delete ON dvr_channels;

DROP POLICY IF EXISTS switch_ports_select ON switch_ports;
DROP POLICY IF EXISTS switch_ports_insert ON switch_ports;
DROP POLICY IF EXISTS switch_ports_update ON switch_ports;
DROP POLICY IF EXISTS switch_ports_delete ON switch_ports;

DROP POLICY IF EXISTS clients_select ON clients;
DROP POLICY IF EXISTS clients_insert ON clients;
DROP POLICY IF EXISTS clients_update ON clients;
DROP POLICY IF EXISTS clients_delete ON clients;

DROP POLICY IF EXISTS equipment_models_select ON equipment_models;
DROP POLICY IF EXISTS equipment_models_insert ON equipment_models;
DROP POLICY IF EXISTS equipment_models_update ON equipment_models;
DROP POLICY IF EXISTS equipment_models_delete ON equipment_models;

-- ------------------------------------------------------------
-- Recria policies antigas (auth.uid() = user_id)
-- ------------------------------------------------------------

CREATE POLICY dvrs_select ON dvrs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY dvrs_insert ON dvrs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY dvrs_update ON dvrs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY dvrs_delete ON dvrs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY cameras_select ON cameras FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY cameras_insert ON cameras FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY cameras_update ON cameras FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY cameras_delete ON cameras FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY switches_select ON switches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY switches_insert ON switches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY switches_update ON switches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY switches_delete ON switches FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY baluns_select ON power_baluns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY baluns_insert ON power_baluns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY baluns_update ON power_baluns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY baluns_delete ON power_baluns FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own routers" ON routers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own routers" ON routers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routers" ON routers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own routers" ON routers FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY cable_select ON cable_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY cable_insert ON cable_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY cable_update ON cable_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY cable_delete ON cable_connections FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY credentials_select ON credentials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY credentials_insert ON credentials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY credentials_update ON credentials FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY credentials_delete ON credentials FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own connections" ON internet_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own connections" ON internet_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own connections" ON internet_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own connections" ON internet_connections FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own segments" ON network_segments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own segments" ON network_segments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own segments" ON network_segments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own segments" ON network_segments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own device backups" ON device_backups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own device backups" ON device_backups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own device backups" ON device_backups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own device backups" ON device_backups FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY monitors_owner_all ON monitors FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY racks_owner_all ON racks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own balun 4x1 outputs" ON balun_4x1_outputs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own balun 4x1 outputs" ON balun_4x1_outputs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own balun 4x1 outputs" ON balun_4x1_outputs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own balun 4x1 outputs" ON balun_4x1_outputs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY balun_ports_select ON balun_ports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY balun_ports_insert ON balun_ports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY balun_ports_update ON balun_ports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY balun_ports_delete ON balun_ports FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY camera_installation_photos_select ON camera_installation_photos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY camera_installation_photos_insert ON camera_installation_photos FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY camera_installation_photos_update ON camera_installation_photos FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY camera_installation_photos_delete ON camera_installation_photos FOR DELETE USING (user_id = auth.uid());

CREATE POLICY switch_ports_select ON switch_ports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY switch_ports_insert ON switch_ports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY switch_ports_update ON switch_ports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY switch_ports_delete ON switch_ports FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY clients_select ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY clients_insert ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY clients_update ON clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY clients_delete ON clients FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY equipment_models_select ON equipment_models FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY equipment_models_insert ON equipment_models FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY equipment_models_update ON equipment_models FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY equipment_models_delete ON equipment_models FOR DELETE USING (auth.uid() = user_id);

COMMIT;
