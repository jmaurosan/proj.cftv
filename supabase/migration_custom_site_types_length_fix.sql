-- Corrige o limite legado de 30 caracteres.
-- Uma chave personalizada possui 39 caracteres: "custom_" + UUID sem hifens.

BEGIN;

DROP TRIGGER IF EXISTS installation_sites_validate_type
  ON public.installation_sites;

ALTER TABLE public.installation_sites
  ALTER COLUMN site_type TYPE varchar(80);

CREATE TRIGGER installation_sites_validate_type
  BEFORE INSERT OR UPDATE OF client_id, site_type ON public.installation_sites
  FOR EACH ROW EXECUTE FUNCTION public.validate_installation_site_type();

INSERT INTO public.app_schema_releases (version, description)
VALUES ('2026.08.26.2', 'Amplia tipo de local e permite chaves personalizadas')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

COMMIT;
