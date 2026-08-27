-- Tipos de local personalizados por cliente.
-- Aplicar no SQL Editor do Supabase antes de publicar a interface.

BEGIN;

CREATE TABLE IF NOT EXISTS public.installation_site_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_key    text NOT NULL DEFAULT ('custom_' || replace(gen_random_uuid()::text, '-', '')),
  name        varchar(80) NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT installation_site_types_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT installation_site_types_key_format CHECK (type_key ~ '^custom_[a-f0-9]{32}$'),
  CONSTRAINT installation_site_types_client_key_unique UNIQUE (client_id, type_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS installation_site_types_client_name_unique
  ON public.installation_site_types (client_id, lower(btrim(name)));

-- O CHECK original enumerava apenas os tipos fixos. A coluna continua texto,
-- agora aceitando tambem as chaves custom_<uuid> geradas acima.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = rel.relnamespace
     WHERE ns.nspname = 'public'
       AND rel.relname = 'installation_sites'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%site_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.installation_sites DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.installation_sites
  ADD CONSTRAINT installation_sites_site_type_valid
  CHECK (
    site_type IN (
      'elevador_social', 'elevador_servico', 'elevador_panoramico',
      'bloco', 'pavimento', 'guarita', 'portaria', 'estacionamento',
      'area_comum', 'ext_externo', 'outro'
    ) OR site_type ~ '^custom_[a-f0-9]{32}$'
  );

ALTER TABLE public.installation_site_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS installation_site_types_select ON public.installation_site_types;
CREATE POLICY installation_site_types_select ON public.installation_site_types FOR SELECT
  USING (public.user_has_client_role(client_id, ARRAY['owner','operator','viewer']));

DROP POLICY IF EXISTS installation_site_types_insert ON public.installation_site_types;
CREATE POLICY installation_site_types_insert ON public.installation_site_types FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.user_has_client_role(client_id, ARRAY['owner','operator']));

DROP POLICY IF EXISTS installation_site_types_update ON public.installation_site_types;
CREATE POLICY installation_site_types_update ON public.installation_site_types FOR UPDATE
  USING (public.user_has_client_role(client_id, ARRAY['owner','operator']))
  WITH CHECK (public.user_has_client_role(client_id, ARRAY['owner','operator']));

DROP POLICY IF EXISTS installation_site_types_delete ON public.installation_site_types;

CREATE OR REPLACE FUNCTION public.validate_installation_site_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.site_type LIKE 'custom_%' AND NOT EXISTS (
    SELECT 1
      FROM public.installation_site_types type
     WHERE type.client_id = NEW.client_id
       AND type.type_key = NEW.site_type
  ) THEN
    RAISE EXCEPTION 'Tipo de local personalizado inválido para este cliente.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS installation_sites_validate_type ON public.installation_sites;
CREATE TRIGGER installation_sites_validate_type
  BEFORE INSERT OR UPDATE OF client_id, site_type ON public.installation_sites
  FOR EACH ROW EXECUTE FUNCTION public.validate_installation_site_type();

DROP TRIGGER IF EXISTS installation_site_types_updated_at ON public.installation_site_types;
CREATE TRIGGER installation_site_types_updated_at
  BEFORE UPDATE ON public.installation_site_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

REVOKE ALL ON public.installation_site_types FROM authenticated;
GRANT SELECT ON public.installation_site_types TO authenticated;
GRANT INSERT (client_id, user_id, name) ON public.installation_site_types TO authenticated;
GRANT UPDATE (name, is_active) ON public.installation_site_types TO authenticated;

INSERT INTO public.app_schema_releases (version, description)
VALUES ('2026.08.26.1', 'Tipos de local personalizados por cliente')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

COMMIT;
