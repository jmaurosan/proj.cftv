-- ========================================================
-- MIGRATION: device-backups private storage hardening
-- Makes the shared technical-document bucket private and
-- replaces public/authenticated-wide policies with owner checks.
-- ========================================================

UPDATE storage.buckets
SET public = false
WHERE id = 'device-backups';

DROP POLICY IF EXISTS "Allow public select on backups" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert on backups" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete on backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can select own private backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own private backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own private backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own private backups" ON storage.objects;

CREATE POLICY "Users can select own private backups" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'device-backups'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
        AND EXISTS (
          SELECT 1 FROM public.clients
          WHERE clients.id = split_part(name, '/', 2)::uuid
          AND clients.user_id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.device_backups
        WHERE device_backups.file_path = storage.objects.name
        AND device_backups.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert own private backups" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'device-backups'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
        AND EXISTS (
          SELECT 1 FROM public.clients
          WHERE clients.id = split_part(name, '/', 2)::uuid
          AND clients.user_id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.device_backups
        WHERE device_backups.file_path = storage.objects.name
        AND device_backups.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own private backups" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'device-backups'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
        AND EXISTS (
          SELECT 1 FROM public.clients
          WHERE clients.id = split_part(name, '/', 2)::uuid
          AND clients.user_id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.device_backups
        WHERE device_backups.file_path = storage.objects.name
        AND device_backups.user_id = auth.uid()
      )
    )
  ) WITH CHECK (
    bucket_id = 'device-backups'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
        AND EXISTS (
          SELECT 1 FROM public.clients
          WHERE clients.id = split_part(name, '/', 2)::uuid
          AND clients.user_id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.device_backups
        WHERE device_backups.file_path = storage.objects.name
        AND device_backups.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete own private backups" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'device-backups'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
        AND EXISTS (
          SELECT 1 FROM public.clients
          WHERE clients.id = split_part(name, '/', 2)::uuid
          AND clients.user_id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.device_backups
        WHERE device_backups.file_path = storage.objects.name
        AND device_backups.user_id = auth.uid()
      )
    )
  );
