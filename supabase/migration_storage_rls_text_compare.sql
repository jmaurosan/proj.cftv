-- ============================================================
-- Storage RLS: comparação por text + suporte multi-tenant
-- ============================================================
-- Motivação:
--   As policies anteriores usavam split_part(...)::uuid dentro de EXISTS.
--   Mesmo com o regex ~* '^[0-9a-f-]{36}$' na frente, o planner do PostgreSQL
--   às vezes avalia o cast antes do filtro, disparando:
--     "invalid input syntax for type uuid: ''"
--   quando o path da mídia não segue o formato esperado.
--
-- Solução:
--   1) Comparar por TEXT (clients.id::text = split_part(...)) — sem cast que
--      possa falhar.
--   2) Adicionar branch de client_members para permitir que membros do mesmo
--      cliente visualizem/editem mídias do projeto (multi-tenant SaaS).
-- ============================================================

DROP POLICY IF EXISTS "Users can select own private backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own private backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own private backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own private backups" ON storage.objects;

-- ------------------------------------------------------------
-- SELECT
-- ------------------------------------------------------------
CREATE POLICY "Users can select own private backups" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'device-backups'
    AND (
      -- Path novo: {userId}/[documents|media]/{clientId}/...
      split_part(name, '/', 1) = auth.uid()::text
      -- Path novo mas outro usuário membro do mesmo cliente
      OR (
        split_part(name, '/', 2) IN ('documents', 'media')
        AND EXISTS (
          SELECT 1 FROM public.client_members cm
          WHERE cm.user_id = auth.uid()
            AND cm.client_id::text = split_part(name, '/', 3)
        )
      )
      -- Legacy: [documents|media]/{clientId}/...
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id::text = split_part(name, '/', 2)
            AND (
              c.user_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.client_members cm
                WHERE cm.user_id = auth.uid() AND cm.client_id = c.id
              )
            )
        )
      )
      -- Device backup entry
      OR EXISTS (
        SELECT 1 FROM public.device_backups db
        WHERE db.file_path = storage.objects.name
          AND db.user_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------
-- INSERT
-- ------------------------------------------------------------
CREATE POLICY "Users can insert own private backups" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'device-backups'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 2) IN ('documents', 'media')
        AND EXISTS (
          SELECT 1 FROM public.client_members cm
          WHERE cm.user_id = auth.uid()
            AND cm.client_id::text = split_part(name, '/', 3)
        )
      )
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id::text = split_part(name, '/', 2)
            AND (
              c.user_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.client_members cm
                WHERE cm.user_id = auth.uid() AND cm.client_id = c.id
              )
            )
        )
      )
    )
  );

-- ------------------------------------------------------------
-- UPDATE
-- ------------------------------------------------------------
CREATE POLICY "Users can update own private backups" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'device-backups'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 2) IN ('documents', 'media')
        AND EXISTS (
          SELECT 1 FROM public.client_members cm
          WHERE cm.user_id = auth.uid()
            AND cm.client_id::text = split_part(name, '/', 3)
        )
      )
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id::text = split_part(name, '/', 2)
            AND (
              c.user_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.client_members cm
                WHERE cm.user_id = auth.uid() AND cm.client_id = c.id
              )
            )
        )
      )
    )
  ) WITH CHECK (
    bucket_id = 'device-backups'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 2) IN ('documents', 'media')
        AND EXISTS (
          SELECT 1 FROM public.client_members cm
          WHERE cm.user_id = auth.uid()
            AND cm.client_id::text = split_part(name, '/', 3)
        )
      )
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id::text = split_part(name, '/', 2)
            AND (
              c.user_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.client_members cm
                WHERE cm.user_id = auth.uid() AND cm.client_id = c.id
              )
            )
        )
      )
    )
  );

-- ------------------------------------------------------------
-- DELETE
-- ------------------------------------------------------------
CREATE POLICY "Users can delete own private backups" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'device-backups'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 2) IN ('documents', 'media')
        AND EXISTS (
          SELECT 1 FROM public.client_members cm
          WHERE cm.user_id = auth.uid()
            AND cm.client_id::text = split_part(name, '/', 3)
        )
      )
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND EXISTS (
          SELECT 1 FROM public.clients c
          WHERE c.id::text = split_part(name, '/', 2)
            AND (
              c.user_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.client_members cm
                WHERE cm.user_id = auth.uid() AND cm.client_id = c.id
              )
            )
        )
      )
    )
  );
