-- Midias privadas (limite 4), edicao de registros e pendencias automaticas.

BEGIN;

CREATE TABLE IF NOT EXISTS public.commissioning_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  commissioning_id uuid NOT NULL REFERENCES public.equipment_commissioning(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image','video')),
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commissioning_media_record
  ON public.commissioning_media(client_id, commissioning_id, created_at);

ALTER TABLE public.commissioning_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS commissioning_media_role_select ON public.commissioning_media;
DROP POLICY IF EXISTS commissioning_media_role_insert ON public.commissioning_media;
DROP POLICY IF EXISTS commissioning_media_role_delete ON public.commissioning_media;
CREATE POLICY commissioning_media_role_select ON public.commissioning_media FOR SELECT
  USING (public.user_has_client_role(client_id, ARRAY['owner','operator','viewer']));
CREATE POLICY commissioning_media_role_insert ON public.commissioning_media FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.user_has_client_role(client_id, ARRAY['owner','operator']));
CREATE POLICY commissioning_media_role_delete ON public.commissioning_media FOR DELETE
  USING (public.user_has_client_role(client_id, ARRAY['owner','operator']));

CREATE OR REPLACE FUNCTION public.enforce_commissioning_media_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.commissioning_media WHERE commissioning_id = NEW.commissioning_id) >= 4 THEN
    RAISE EXCEPTION 'Limite de 4 midias por comissionamento atingido.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commissioning_media_limit ON public.commissioning_media;
CREATE TRIGGER trg_commissioning_media_limit BEFORE INSERT ON public.commissioning_media
  FOR EACH ROW EXECUTE FUNCTION public.enforce_commissioning_media_limit();

CREATE TABLE IF NOT EXISTS public.technical_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  commissioning_id uuid REFERENCES public.equipment_commissioning(id) ON DELETE CASCADE,
  equipment_type text NOT NULL,
  equipment_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_technical_issue_open_commissioning
  ON public.technical_issues(commissioning_id)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_technical_issues_client_status
  ON public.technical_issues(client_id, status, priority, created_at DESC);

ALTER TABLE public.technical_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS technical_issues_role_select ON public.technical_issues;
DROP POLICY IF EXISTS technical_issues_role_insert ON public.technical_issues;
DROP POLICY IF EXISTS technical_issues_role_update ON public.technical_issues;
DROP POLICY IF EXISTS technical_issues_role_delete ON public.technical_issues;
CREATE POLICY technical_issues_role_select ON public.technical_issues FOR SELECT
  USING (public.user_has_client_role(client_id, ARRAY['owner','operator','viewer']));
CREATE POLICY technical_issues_role_insert ON public.technical_issues FOR INSERT
  WITH CHECK (public.user_has_client_role(client_id, ARRAY['owner','operator']));
CREATE POLICY technical_issues_role_update ON public.technical_issues FOR UPDATE
  USING (public.user_has_client_role(client_id, ARRAY['owner','operator']))
  WITH CHECK (public.user_has_client_role(client_id, ARRAY['owner','operator']));
CREATE POLICY technical_issues_role_delete ON public.technical_issues FOR DELETE
  USING (public.user_has_client_role(client_id, ARRAY['owner']));

CREATE OR REPLACE FUNCTION public.create_commissioning_issue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('attention','failed') THEN
    INSERT INTO public.technical_issues (
      client_id, commissioning_id, equipment_type, equipment_id,
      title, description, priority, created_by
    ) VALUES (
      NEW.client_id, NEW.id, NEW.equipment_type, NEW.equipment_id,
      CASE WHEN NEW.status = 'failed' THEN 'Equipamento reprovado no comissionamento' ELSE 'Equipamento requer atencao' END,
      NEW.notes,
      CASE WHEN NEW.status = 'failed' THEN 'high' ELSE 'medium' END,
      COALESCE(auth.uid(), NEW.created_by)
    )
    ON CONFLICT (commissioning_id) WHERE status = 'open' DO UPDATE
    SET title = EXCLUDED.title, description = EXCLUDED.description,
        priority = EXCLUDED.priority, updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_commissioning_issue ON public.equipment_commissioning;
CREATE TRIGGER trg_create_commissioning_issue
  AFTER INSERT OR UPDATE OF status, notes ON public.equipment_commissioning
  FOR EACH ROW EXECUTE FUNCTION public.create_commissioning_issue();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'commissioning-media', 'commissioning-media', false, 52428800,
  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO UPDATE
SET public = false, file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS commissioning_media_storage_select ON storage.objects;
DROP POLICY IF EXISTS commissioning_media_storage_insert ON storage.objects;
DROP POLICY IF EXISTS commissioning_media_storage_delete ON storage.objects;
CREATE POLICY commissioning_media_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'commissioning-media'
    AND public.user_has_client_role((storage.foldername(name))[1]::uuid, ARRAY['owner','operator','viewer'])
  );
CREATE POLICY commissioning_media_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'commissioning-media'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.user_has_client_role((storage.foldername(name))[1]::uuid, ARRAY['owner','operator'])
  );
CREATE POLICY commissioning_media_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'commissioning-media'
    AND public.user_has_client_role((storage.foldername(name))[1]::uuid, ARRAY['owner','operator'])
  );

GRANT SELECT, INSERT, DELETE ON public.commissioning_media TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technical_issues TO authenticated;

INSERT INTO public.app_schema_releases (version, description)
VALUES ('2026.08.24.4', 'Midias privadas e pendencias automaticas de comissionamento')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

COMMIT;
