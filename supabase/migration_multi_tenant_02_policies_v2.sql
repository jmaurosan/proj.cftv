-- ============================================================
-- Multi-Tenant Fase 2 — Policies v2 (paralelas às antigas)
-- ============================================================
-- Cria policies NOVAS com sufixo _v2 para cada tabela.
-- NÃO altera as policies existentes — as duas coexistem.
--
-- Efeito prático: enquanto _v2 existir junto com a antiga,
-- PostgreSQL faz OR entre as policies (default = PERMISSIVE),
-- então acesso continua funcionando normalmente. A troca real
-- acontece na Fase 3.
--
-- Predicado padrão:
--   is_admin() OR user_has_client_access(client_id)
--
-- Casos especiais:
--   - clients: usa `id` em vez de `client_id`
--   - equipment_models: catálogo — SELECT público, escrita restrita
--   - client_members: já foi criada com policies na Fase 1
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Tabelas com client_id direto
-- ------------------------------------------------------------

-- dvrs
CREATE POLICY dvrs_select_v2 ON dvrs FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY dvrs_insert_v2 ON dvrs FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY dvrs_update_v2 ON dvrs FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY dvrs_delete_v2 ON dvrs FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- cameras
CREATE POLICY cameras_select_v2 ON cameras FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY cameras_insert_v2 ON cameras FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY cameras_update_v2 ON cameras FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY cameras_delete_v2 ON cameras FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- switches
CREATE POLICY switches_select_v2 ON switches FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY switches_insert_v2 ON switches FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY switches_update_v2 ON switches FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY switches_delete_v2 ON switches FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- power_baluns
CREATE POLICY power_baluns_select_v2 ON power_baluns FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY power_baluns_insert_v2 ON power_baluns FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY power_baluns_update_v2 ON power_baluns FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY power_baluns_delete_v2 ON power_baluns FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- routers
CREATE POLICY routers_select_v2 ON routers FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY routers_insert_v2 ON routers FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY routers_update_v2 ON routers FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY routers_delete_v2 ON routers FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- cable_connections
CREATE POLICY cable_connections_select_v2 ON cable_connections FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY cable_connections_insert_v2 ON cable_connections FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY cable_connections_update_v2 ON cable_connections FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY cable_connections_delete_v2 ON cable_connections FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- credentials (contém senhas — cuidado dobrado)
CREATE POLICY credentials_select_v2 ON credentials FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY credentials_insert_v2 ON credentials FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY credentials_update_v2 ON credentials FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY credentials_delete_v2 ON credentials FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- internet_connections
CREATE POLICY internet_connections_select_v2 ON internet_connections FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY internet_connections_insert_v2 ON internet_connections FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY internet_connections_update_v2 ON internet_connections FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY internet_connections_delete_v2 ON internet_connections FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- network_segments
CREATE POLICY network_segments_select_v2 ON network_segments FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY network_segments_insert_v2 ON network_segments FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY network_segments_update_v2 ON network_segments FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY network_segments_delete_v2 ON network_segments FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- device_backups
CREATE POLICY device_backups_select_v2 ON device_backups FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY device_backups_insert_v2 ON device_backups FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY device_backups_update_v2 ON device_backups FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY device_backups_delete_v2 ON device_backups FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- monitors
CREATE POLICY monitors_select_v2 ON monitors FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY monitors_insert_v2 ON monitors FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY monitors_update_v2 ON monitors FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY monitors_delete_v2 ON monitors FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- racks
CREATE POLICY racks_select_v2 ON racks FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY racks_insert_v2 ON racks FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY racks_update_v2 ON racks FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY racks_delete_v2 ON racks FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- ------------------------------------------------------------
-- Tabelas com client_id populado na Fase 1
-- ------------------------------------------------------------

-- balun_4x1_outputs
CREATE POLICY balun_4x1_outputs_select_v2 ON balun_4x1_outputs FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY balun_4x1_outputs_insert_v2 ON balun_4x1_outputs FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY balun_4x1_outputs_update_v2 ON balun_4x1_outputs FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY balun_4x1_outputs_delete_v2 ON balun_4x1_outputs FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- balun_ports
CREATE POLICY balun_ports_select_v2 ON balun_ports FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY balun_ports_insert_v2 ON balun_ports FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY balun_ports_update_v2 ON balun_ports FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY balun_ports_delete_v2 ON balun_ports FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- camera_installation_photos
CREATE POLICY camera_installation_photos_select_v2 ON camera_installation_photos FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY camera_installation_photos_insert_v2 ON camera_installation_photos FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY camera_installation_photos_update_v2 ON camera_installation_photos FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY camera_installation_photos_delete_v2 ON camera_installation_photos FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- dvr_channels
CREATE POLICY dvr_channels_select_v2 ON dvr_channels FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY dvr_channels_insert_v2 ON dvr_channels FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY dvr_channels_update_v2 ON dvr_channels FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY dvr_channels_delete_v2 ON dvr_channels FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- switch_ports
CREATE POLICY switch_ports_select_v2 ON switch_ports FOR SELECT
  USING (is_admin() OR user_has_client_access(client_id));
CREATE POLICY switch_ports_insert_v2 ON switch_ports FOR INSERT
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY switch_ports_update_v2 ON switch_ports FOR UPDATE
  USING (is_admin() OR user_has_client_access(client_id))
  WITH CHECK (is_admin() OR user_has_client_access(client_id));
CREATE POLICY switch_ports_delete_v2 ON switch_ports FOR DELETE
  USING (is_admin() OR user_has_client_access(client_id));

-- ------------------------------------------------------------
-- Caso especial: clients (usa `id` em vez de `client_id`)
-- ------------------------------------------------------------
CREATE POLICY clients_select_v2 ON clients FOR SELECT
  USING (is_admin() OR user_has_client_access(id));
CREATE POLICY clients_insert_v2 ON clients FOR INSERT
  WITH CHECK (is_admin());
CREATE POLICY clients_update_v2 ON clients FOR UPDATE
  USING (is_admin() OR user_has_client_access(id))
  WITH CHECK (is_admin() OR user_has_client_access(id));
CREATE POLICY clients_delete_v2 ON clients FOR DELETE
  USING (is_admin());

-- ------------------------------------------------------------
-- Caso especial: equipment_models (catálogo compartilhado)
-- ------------------------------------------------------------
-- Todos autenticados leem. Só admin ou dono original modifica.
CREATE POLICY equipment_models_select_v2 ON equipment_models FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY equipment_models_insert_v2 ON equipment_models FOR INSERT
  WITH CHECK (is_admin() OR auth.uid() = user_id);
CREATE POLICY equipment_models_update_v2 ON equipment_models FOR UPDATE
  USING (is_admin() OR auth.uid() = user_id)
  WITH CHECK (is_admin() OR auth.uid() = user_id);
CREATE POLICY equipment_models_delete_v2 ON equipment_models FOR DELETE
  USING (is_admin() OR auth.uid() = user_id);

COMMIT;

-- ============================================================
-- Verificação
-- ============================================================
-- SELECT tablename, policyname FROM pg_policies
-- WHERE schemaname='public' AND policyname LIKE '%_v2'
-- ORDER BY tablename, policyname;
