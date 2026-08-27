-- Historico multi-tenant e comissionamento tecnico por equipamento.

BEGIN;

CREATE TABLE IF NOT EXISTS public.equipment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type varchar(20) NOT NULL,
  equipment_id uuid,
  action varchar(10) NOT NULL,
  equipment_name varchar(200),
  details jsonb,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  changed_fields text[] NOT NULL DEFAULT '{}',
  previous_data jsonb,
  current_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_logs
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS changed_fields text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS previous_data jsonb,
  ADD COLUMN IF NOT EXISTS current_data jsonb;

UPDATE public.equipment_logs log
SET client_id = CASE log.equipment_type
  WHEN 'camera' THEN (SELECT client_id FROM public.cameras WHERE id = log.equipment_id)
  WHEN 'dvr' THEN (SELECT client_id FROM public.dvrs WHERE id = log.equipment_id)
  WHEN 'switch' THEN (SELECT client_id FROM public.switches WHERE id = log.equipment_id)
  WHEN 'balun' THEN (SELECT client_id FROM public.power_baluns WHERE id = log.equipment_id)
  ELSE NULL
END
WHERE log.client_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_logs_client_created
  ON public.equipment_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_user
  ON public.equipment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_type
  ON public.equipment_logs(equipment_type);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_equipment
  ON public.equipment_logs(client_id, equipment_type, equipment_id, created_at DESC);

ALTER TABLE public.equipment_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_logs_select ON public.equipment_logs;
DROP POLICY IF EXISTS equipment_logs_insert ON public.equipment_logs;
DROP POLICY IF EXISTS equipment_logs_role_select ON public.equipment_logs;
DROP POLICY IF EXISTS equipment_logs_role_insert ON public.equipment_logs;
CREATE POLICY equipment_logs_role_select ON public.equipment_logs FOR SELECT
  USING (public.user_has_client_role(client_id, ARRAY['owner','operator','viewer']));
-- Logs automaticos sao gravados apenas pelos triggers SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.sanitize_equipment_log_data(value jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(value, '{}'::jsonb) - ARRAY[
    'password', 'streaming_password', 'verification_code',
    'secret_ciphertext', 'private_key', 'qr_code_url', 'rtsp_url'
  ];
$$;

CREATE OR REPLACE FUNCTION public.log_equipment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_data jsonb;
  new_data jsonb;
  changed text[] := ARRAY[]::text[];
  key_name text;
  row_client_id uuid;
  row_user_id uuid;
  row_equipment_id uuid;
  row_name text;
BEGIN
  old_data := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE public.sanitize_equipment_log_data(to_jsonb(OLD)) END;
  new_data := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE public.sanitize_equipment_log_data(to_jsonb(NEW)) END;

  IF TG_OP = 'UPDATE' THEN
    FOR key_name IN SELECT jsonb_object_keys(new_data)
    LOOP
      IF old_data -> key_name IS DISTINCT FROM new_data -> key_name THEN
        changed := array_append(changed, key_name);
      END IF;
    END LOOP;
    IF cardinality(changed) = 0 THEN
      RETURN NEW;
    END IF;
  END IF;

  row_client_id := COALESCE((new_data ->> 'client_id')::uuid, (old_data ->> 'client_id')::uuid);
  row_user_id := COALESCE(auth.uid(), (new_data ->> 'user_id')::uuid, (old_data ->> 'user_id')::uuid);
  row_equipment_id := COALESCE((new_data ->> 'id')::uuid, (old_data ->> 'id')::uuid);
  row_name := COALESCE(new_data ->> 'name', old_data ->> 'name', 'Equipamento');

  INSERT INTO public.equipment_logs (
    equipment_type, equipment_id, action, equipment_name, details,
    user_id, client_id, changed_fields, previous_data, current_data
  ) VALUES (
    TG_ARGV[0], row_equipment_id, lower(TG_OP), row_name,
    CASE WHEN TG_OP = 'DELETE' THEN old_data ELSE new_data END,
    row_user_id, row_client_id, changed, old_data, new_data
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS camera_audit_trigger ON public.cameras;
CREATE TRIGGER camera_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.cameras
  FOR EACH ROW EXECUTE FUNCTION public.log_equipment_change('camera');
DROP TRIGGER IF EXISTS dvr_audit_trigger ON public.dvrs;
CREATE TRIGGER dvr_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.dvrs
  FOR EACH ROW EXECUTE FUNCTION public.log_equipment_change('dvr');
DROP TRIGGER IF EXISTS balun_audit_trigger ON public.power_baluns;
CREATE TRIGGER balun_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.power_baluns
  FOR EACH ROW EXECUTE FUNCTION public.log_equipment_change('balun');
DROP TRIGGER IF EXISTS switch_audit_trigger ON public.switches;
CREATE TRIGGER switch_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.switches
  FOR EACH ROW EXECUTE FUNCTION public.log_equipment_change('switch');
DROP TRIGGER IF EXISTS router_audit_trigger ON public.routers;
CREATE TRIGGER router_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.routers
  FOR EACH ROW EXECUTE FUNCTION public.log_equipment_change('router');

CREATE TABLE IF NOT EXISTS public.equipment_commissioning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  equipment_type text NOT NULL CHECK (equipment_type IN ('camera','dvr','switch','balun','router','monitor','nobreak')),
  equipment_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','attention','failed')),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  tested_at timestamptz,
  tested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_commissioning_equipment
  ON public.equipment_commissioning(client_id, equipment_type, equipment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_commissioning_status
  ON public.equipment_commissioning(client_id, status, created_at DESC);

ALTER TABLE public.equipment_commissioning ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS equipment_commissioning_role_select ON public.equipment_commissioning;
DROP POLICY IF EXISTS equipment_commissioning_role_insert ON public.equipment_commissioning;
DROP POLICY IF EXISTS equipment_commissioning_role_update ON public.equipment_commissioning;
DROP POLICY IF EXISTS equipment_commissioning_role_delete ON public.equipment_commissioning;
CREATE POLICY equipment_commissioning_role_select ON public.equipment_commissioning FOR SELECT
  USING (public.user_has_client_role(client_id, ARRAY['owner','operator','viewer']));
CREATE POLICY equipment_commissioning_role_insert ON public.equipment_commissioning FOR INSERT
  WITH CHECK (public.user_has_client_role(client_id, ARRAY['owner','operator']));
CREATE POLICY equipment_commissioning_role_update ON public.equipment_commissioning FOR UPDATE
  USING (public.user_has_client_role(client_id, ARRAY['owner','operator']))
  WITH CHECK (public.user_has_client_role(client_id, ARRAY['owner','operator']));
CREATE POLICY equipment_commissioning_role_delete ON public.equipment_commissioning FOR DELETE
  USING (public.user_has_client_role(client_id, ARRAY['owner']));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_commissioning TO authenticated;
GRANT SELECT ON public.equipment_logs TO authenticated;

INSERT INTO public.app_schema_releases (version, description)
VALUES ('2026.08.24.3', 'Historico multi-tenant sem segredos e comissionamento tecnico')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

COMMIT;
