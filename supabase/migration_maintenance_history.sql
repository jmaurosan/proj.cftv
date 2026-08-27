BEGIN;

CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  equipment_type text NOT NULL CHECK (equipment_type IN ('camera','dvr','switch','balun','router','monitor','nobreak')),
  equipment_id uuid NOT NULL,
  equipment_name text NOT NULL,
  problem_found text NOT NULL,
  service_performed text NOT NULL,
  replaced_part text,
  technician_name text NOT NULL,
  result_status text NOT NULL DEFAULT 'resolved' CHECK (result_status IN ('resolved','monitoring','pending','unresolved')),
  performed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  evidence_paths text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_records_client_date_idx ON public.maintenance_records(client_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS maintenance_records_equipment_idx ON public.maintenance_records(client_id, equipment_type, equipment_id, performed_at DESC);

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS maintenance_records_select ON public.maintenance_records;
DROP POLICY IF EXISTS maintenance_records_insert ON public.maintenance_records;
DROP POLICY IF EXISTS maintenance_records_update ON public.maintenance_records;
DROP POLICY IF EXISTS maintenance_records_delete ON public.maintenance_records;
CREATE POLICY maintenance_records_select ON public.maintenance_records FOR SELECT USING (public.user_has_client_role(client_id, ARRAY['owner','operator','viewer']));
CREATE POLICY maintenance_records_insert ON public.maintenance_records FOR INSERT WITH CHECK (public.user_has_client_role(client_id, ARRAY['owner','operator']));
CREATE POLICY maintenance_records_update ON public.maintenance_records FOR UPDATE USING (public.user_has_client_role(client_id, ARRAY['owner','operator'])) WITH CHECK (public.user_has_client_role(client_id, ARRAY['owner','operator']));
CREATE POLICY maintenance_records_delete ON public.maintenance_records FOR DELETE USING (public.user_has_client_role(client_id, ARRAY['owner']));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_records TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('maintenance-media', 'maintenance-media', false, 52428800, ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS maintenance_media_select ON storage.objects;
DROP POLICY IF EXISTS maintenance_media_insert ON storage.objects;
DROP POLICY IF EXISTS maintenance_media_delete ON storage.objects;
CREATE POLICY maintenance_media_select ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'maintenance-media' AND public.user_has_client_role(split_part(name, '/', 1)::uuid, ARRAY['owner','operator','viewer']));
CREATE POLICY maintenance_media_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'maintenance-media' AND split_part(name, '/', 2) = auth.uid()::text AND public.user_has_client_role(split_part(name, '/', 1)::uuid, ARRAY['owner','operator']));
CREATE POLICY maintenance_media_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'maintenance-media' AND public.user_has_client_role(split_part(name, '/', 1)::uuid, ARRAY['owner','operator']));

INSERT INTO public.app_schema_releases (version, description)
VALUES ('2026.08.25.4', 'Historico tecnico de manutencao por equipamento com evidencias privadas')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

COMMIT;
