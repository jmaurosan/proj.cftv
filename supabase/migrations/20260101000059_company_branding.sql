BEGIN;

CREATE TABLE IF NOT EXISTS public.company_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT 'Sistema CFTV',
  trade_name text,
  document_number text,
  phone text,
  email text,
  address text,
  logo_path text,
  primary_color text NOT NULL DEFAULT '#0891B2' CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_profiles_select ON public.company_profiles;
DROP POLICY IF EXISTS company_profiles_insert ON public.company_profiles;
DROP POLICY IF EXISTS company_profiles_update ON public.company_profiles;
CREATE POLICY company_profiles_select ON public.company_profiles FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY company_profiles_insert ON public.company_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY company_profiles_update ON public.company_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE ON public.company_profiles TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('company-logos', 'company-logos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS company_logos_insert ON storage.objects;
DROP POLICY IF EXISTS company_logos_update ON storage.objects;
DROP POLICY IF EXISTS company_logos_delete ON storage.objects;
CREATE POLICY company_logos_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-logos' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY company_logos_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-logos' AND split_part(name, '/', 1) = auth.uid()::text) WITH CHECK (bucket_id = 'company-logos' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY company_logos_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-logos' AND split_part(name, '/', 1) = auth.uid()::text);

INSERT INTO public.app_schema_releases (version, description)
VALUES ('2026.08.26.1', 'Identidade visual configuravel da empresa operadora')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

COMMIT;
