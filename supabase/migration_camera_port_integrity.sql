-- Mantem cameras e tabelas de portas como uma unica operacao transacional.

BEGIN;

CREATE OR REPLACE FUNCTION public.set_camera_balun_port(
  p_balun_id uuid,
  p_port_number integer,
  p_camera_id uuid,
  p_is_active boolean DEFAULT true,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_balun public.power_baluns%ROWTYPE;
  selected_camera public.cameras%ROWTYPE;
  current_camera_id uuid;
BEGIN
  SELECT * INTO selected_balun FROM public.power_baluns WHERE id = p_balun_id FOR UPDATE;
  IF NOT FOUND OR NOT public.user_has_client_role(selected_balun.client_id, ARRAY['owner','operator']) THEN
    RAISE EXCEPTION 'Power Balun nao encontrado ou sem permissao.' USING ERRCODE = '42501';
  END IF;
  IF p_port_number < 1 OR p_port_number > selected_balun.total_ports THEN
    RAISE EXCEPTION 'Porta do Power Balun fora do limite.' USING ERRCODE = '22023';
  END IF;

  SELECT camera_id INTO current_camera_id
  FROM public.balun_ports WHERE balun_id = p_balun_id AND port_number = p_port_number FOR UPDATE;

  IF current_camera_id IS NOT NULL AND current_camera_id IS DISTINCT FROM p_camera_id THEN
    IF p_camera_id IS NOT NULL THEN
      RAISE EXCEPTION 'Porta do Power Balun ja ocupada.' USING ERRCODE = '23505';
    END IF;
    UPDATE public.cameras SET balun_id = NULL, balun_port = NULL, updated_at = now()
    WHERE id = current_camera_id AND balun_id = p_balun_id AND balun_port = p_port_number;
  END IF;

  IF p_camera_id IS NOT NULL THEN
    SELECT * INTO selected_camera FROM public.cameras WHERE id = p_camera_id FOR UPDATE;
    IF NOT FOUND OR selected_camera.client_id IS DISTINCT FROM selected_balun.client_id THEN
      RAISE EXCEPTION 'Camera nao pertence ao projeto do Power Balun.' USING ERRCODE = '22023';
    END IF;
    UPDATE public.balun_ports SET camera_id = NULL, updated_at = now()
    WHERE camera_id = p_camera_id AND NOT (balun_id = p_balun_id AND port_number = p_port_number);
    UPDATE public.cameras SET balun_id = p_balun_id, balun_port = p_port_number, updated_at = now()
    WHERE id = p_camera_id;
  END IF;

  INSERT INTO public.balun_ports (balun_id, port_number, camera_id, is_active, notes, user_id, client_id)
  VALUES (p_balun_id, p_port_number, p_camera_id, p_is_active, NULLIF(btrim(p_notes), ''), auth.uid(), selected_balun.client_id)
  ON CONFLICT (balun_id, port_number) DO UPDATE SET
    camera_id = EXCLUDED.camera_id, is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_camera_switch_port(
  p_switch_id uuid,
  p_port_number integer,
  p_camera_id uuid,
  p_is_active boolean DEFAULT true,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_switch public.switches%ROWTYPE;
  selected_camera public.cameras%ROWTYPE;
  current_device_type text;
  current_device_id uuid;
BEGIN
  SELECT * INTO selected_switch FROM public.switches WHERE id = p_switch_id FOR UPDATE;
  IF NOT FOUND OR NOT public.user_has_client_role(selected_switch.client_id, ARRAY['owner','operator']) THEN
    RAISE EXCEPTION 'Switch nao encontrado ou sem permissao.' USING ERRCODE = '42501';
  END IF;
  IF p_port_number < 1 OR p_port_number > selected_switch.total_ports THEN
    RAISE EXCEPTION 'Porta do switch fora do limite.' USING ERRCODE = '22023';
  END IF;

  SELECT device_type, device_id INTO current_device_type, current_device_id
  FROM public.switch_ports WHERE switch_id = p_switch_id AND port_number = p_port_number FOR UPDATE;

  IF current_device_id IS NOT NULL AND current_device_id IS DISTINCT FROM p_camera_id THEN
    IF p_camera_id IS NOT NULL THEN
      RAISE EXCEPTION 'Porta do switch ja ocupada.' USING ERRCODE = '23505';
    END IF;
    IF current_device_type = 'camera' THEN
      UPDATE public.cameras SET switch_id = NULL, switch_port = NULL, updated_at = now()
      WHERE id = current_device_id AND switch_id = p_switch_id AND switch_port = p_port_number;
    END IF;
  END IF;

  IF p_camera_id IS NOT NULL THEN
    SELECT * INTO selected_camera FROM public.cameras WHERE id = p_camera_id FOR UPDATE;
    IF NOT FOUND OR selected_camera.client_id IS DISTINCT FROM selected_switch.client_id THEN
      RAISE EXCEPTION 'Camera nao pertence ao projeto do switch.' USING ERRCODE = '22023';
    END IF;
    UPDATE public.switch_ports
    SET device_type = NULL, device_id = NULL, device_name = NULL, updated_at = now()
    WHERE device_type = 'camera' AND device_id = p_camera_id
      AND NOT (switch_id = p_switch_id AND port_number = p_port_number);
    UPDATE public.cameras SET switch_id = p_switch_id, switch_port = p_port_number, updated_at = now()
    WHERE id = p_camera_id;
  END IF;

  INSERT INTO public.switch_ports (switch_id, port_number, device_type, device_id, device_name, is_active, notes, user_id, client_id)
  VALUES (
    p_switch_id, p_port_number,
    CASE WHEN p_camera_id IS NULL THEN NULL ELSE 'camera' END,
    p_camera_id, CASE WHEN p_camera_id IS NULL THEN NULL ELSE selected_camera.name END,
    p_is_active, NULLIF(btrim(p_notes), ''), auth.uid(), selected_switch.client_id
  )
  ON CONFLICT (switch_id, port_number) DO UPDATE SET
    device_type = EXCLUDED.device_type, device_id = EXCLUDED.device_id,
    device_name = EXCLUDED.device_name, is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.diagnose_camera_connection_integrity(p_client_id uuid)
RETURNS TABLE (issue_type text, camera_id uuid, camera_name text, details text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 'camera_switch_without_port', c.id, c.name,
         format('Camera aponta para switch %s porta %s, mas a porta nao confirma o vinculo.', c.switch_id, c.switch_port)
  FROM public.cameras c
  LEFT JOIN public.switch_ports sp ON sp.switch_id=c.switch_id AND sp.port_number=c.switch_port AND sp.device_type='camera' AND sp.device_id=c.id
  WHERE c.client_id=p_client_id AND public.user_has_client_role(p_client_id, ARRAY['owner','operator','viewer'])
    AND c.switch_id IS NOT NULL AND sp.id IS NULL
  UNION ALL
  SELECT 'switch_port_without_camera', c.id, c.name,
         format('Porta %s do switch %s aponta para a camera, mas o cadastro da camera diverge.', sp.port_number, sp.switch_id)
  FROM public.switch_ports sp JOIN public.cameras c ON c.id=sp.device_id AND sp.device_type='camera'
  WHERE c.client_id=p_client_id AND public.user_has_client_role(p_client_id, ARRAY['owner','operator','viewer'])
    AND (c.switch_id IS DISTINCT FROM sp.switch_id OR c.switch_port IS DISTINCT FROM sp.port_number)
  UNION ALL
  SELECT 'camera_balun_without_port', c.id, c.name,
         format('Camera aponta para Power Balun %s porta %s, mas a porta nao confirma o vinculo.', c.balun_id, c.balun_port)
  FROM public.cameras c
  LEFT JOIN public.balun_ports bp ON bp.balun_id=c.balun_id AND bp.port_number=c.balun_port AND bp.camera_id=c.id
  WHERE c.client_id=p_client_id AND public.user_has_client_role(p_client_id, ARRAY['owner','operator','viewer'])
    AND c.balun_id IS NOT NULL AND bp.id IS NULL
  UNION ALL
  SELECT 'balun_port_without_camera', c.id, c.name,
         format('Porta %s do Power Balun %s aponta para a camera, mas o cadastro da camera diverge.', bp.port_number, bp.balun_id)
  FROM public.balun_ports bp JOIN public.cameras c ON c.id=bp.camera_id
  WHERE c.client_id=p_client_id AND public.user_has_client_role(p_client_id, ARRAY['owner','operator','viewer'])
    AND (c.balun_id IS DISTINCT FROM bp.balun_id OR c.balun_port IS DISTINCT FROM bp.port_number);
$$;

REVOKE ALL ON FUNCTION public.set_camera_balun_port(uuid,integer,uuid,boolean,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_camera_switch_port(uuid,integer,uuid,boolean,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.diagnose_camera_connection_integrity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_camera_balun_port(uuid,integer,uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_camera_switch_port(uuid,integer,uuid,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.diagnose_camera_connection_integrity(uuid) TO authenticated;

INSERT INTO public.app_schema_releases (version, description)
VALUES ('2026.08.26.4', 'Portas de camera transacionais e diagnostico de divergencias')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

COMMIT;
