-- Atualiza DVR/canal, Power Balun/porta e switch/porta na mesma transacao.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_schema_releases (
  version text PRIMARY KEY,
  description text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by uuid DEFAULT auth.uid()
);

CREATE OR REPLACE FUNCTION public.update_camera_connections(
  p_camera_id uuid,
  p_dvr_id uuid,
  p_channel_number integer,
  p_balun_id uuid,
  p_balun_port integer,
  p_switch_id uuid,
  p_switch_port integer
)
RETURNS TABLE (camera_id uuid, displaced_camera_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_camera public.cameras%ROWTYPE;
  displaced_camera public.cameras%ROWTYPE;
  target_balun_port public.balun_ports%ROWTYPE;
  target_switch_port public.switch_ports%ROWTYPE;
BEGIN
  SELECT * INTO source_camera
  FROM public.cameras
  WHERE id = p_camera_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Camera nao encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.user_has_client_role(source_camera.client_id, ARRAY['owner','operator']) THEN
    RAISE EXCEPTION 'Sem permissao para alterar os vinculos desta camera.' USING ERRCODE = '42501';
  END IF;

  IF (p_dvr_id IS NULL) <> (p_channel_number IS NULL) THEN
    RAISE EXCEPTION 'DVR e canal devem ser informados juntos.' USING ERRCODE = '22023';
  END IF;
  IF (p_balun_id IS NULL) <> (p_balun_port IS NULL) THEN
    RAISE EXCEPTION 'Power Balun e porta devem ser informados juntos.' USING ERRCODE = '22023';
  END IF;
  IF (p_switch_id IS NULL) <> (p_switch_port IS NULL) THEN
    RAISE EXCEPTION 'Switch e porta devem ser informados juntos.' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(p_channel_number, 1) < 1 OR COALESCE(p_balun_port, 1) < 1 OR COALESCE(p_switch_port, 1) < 1 THEN
    RAISE EXCEPTION 'Canal e portas devem ser maiores que zero.' USING ERRCODE = '22023';
  END IF;

  IF p_dvr_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.dvrs WHERE id = p_dvr_id AND client_id = source_camera.client_id
  ) THEN
    RAISE EXCEPTION 'DVR nao pertence ao projeto da camera.' USING ERRCODE = '22023';
  END IF;
  IF p_balun_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.power_baluns WHERE id = p_balun_id AND client_id = source_camera.client_id
  ) THEN
    RAISE EXCEPTION 'Power Balun nao pertence ao projeto da camera.' USING ERRCODE = '22023';
  END IF;
  IF p_switch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.switches WHERE id = p_switch_id AND client_id = source_camera.client_id
  ) THEN
    RAISE EXCEPTION 'Switch nao pertence ao projeto da camera.' USING ERRCODE = '22023';
  END IF;

  IF p_dvr_id IS NOT NULL THEN
    SELECT * INTO displaced_camera
    FROM public.cameras
    WHERE dvr_id = p_dvr_id AND channel_number = p_channel_number AND id <> source_camera.id
    FOR UPDATE;
  END IF;

  IF p_balun_id IS NOT NULL THEN
    SELECT * INTO target_balun_port
    FROM public.balun_ports
    WHERE balun_id = p_balun_id AND port_number = p_balun_port
    FOR UPDATE;

    IF target_balun_port.camera_id IS NOT NULL AND target_balun_port.camera_id <> source_camera.id THEN
      RAISE EXCEPTION 'Porta % do Power Balun ja esta ocupada.', p_balun_port USING ERRCODE = '23505';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.cameras
      WHERE balun_id = p_balun_id AND balun_port = p_balun_port AND id <> source_camera.id
    ) THEN
      RAISE EXCEPTION 'Porta % do Power Balun ja esta vinculada a outra camera.', p_balun_port USING ERRCODE = '23505';
    END IF;
  END IF;

  IF p_switch_id IS NOT NULL THEN
    SELECT * INTO target_switch_port
    FROM public.switch_ports
    WHERE switch_id = p_switch_id AND port_number = p_switch_port
    FOR UPDATE;

    IF target_switch_port.device_id IS NOT NULL AND target_switch_port.device_id <> source_camera.id THEN
      RAISE EXCEPTION 'Porta % do switch ja esta ocupada.', p_switch_port USING ERRCODE = '23505';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.cameras
      WHERE switch_id = p_switch_id AND switch_port = p_switch_port AND id <> source_camera.id
    ) THEN
      RAISE EXCEPTION 'Porta % do switch ja esta vinculada a outra camera.', p_switch_port USING ERRCODE = '23505';
    END IF;
  END IF;

  -- Libera a origem antes da troca para respeitar indices unicos.
  UPDATE public.cameras
  SET dvr_id = NULL, channel_number = NULL,
      balun_id = NULL, balun_port = NULL,
      switch_id = NULL, switch_port = NULL,
      updated_at = now()
  WHERE id = source_camera.id;

  IF displaced_camera.id IS NOT NULL THEN
    UPDATE public.cameras
    SET dvr_id = source_camera.dvr_id,
        channel_number = source_camera.channel_number,
        updated_at = now()
    WHERE id = displaced_camera.id;
  END IF;

  -- Preserve observacoes e estado administrativo das portas de origem.
  UPDATE public.balun_ports
  SET camera_id = NULL, updated_at = now()
  WHERE camera_id = source_camera.id;
  UPDATE public.switch_ports
  SET device_type = NULL, device_id = NULL, device_name = NULL, updated_at = now()
  WHERE device_type = 'camera' AND device_id = source_camera.id;

  IF p_balun_id IS NOT NULL THEN
    INSERT INTO public.balun_ports (
      balun_id, port_number, camera_id, user_id, client_id
    ) VALUES (
      p_balun_id, p_balun_port, source_camera.id, auth.uid(), source_camera.client_id
    )
    ON CONFLICT (balun_id, port_number) DO UPDATE
    SET camera_id = EXCLUDED.camera_id, updated_at = now();
  END IF;

  IF p_switch_id IS NOT NULL THEN
    INSERT INTO public.switch_ports (
      switch_id, port_number, device_type, device_id, device_name, user_id, client_id
    ) VALUES (
      p_switch_id, p_switch_port, 'camera', source_camera.id, source_camera.name, auth.uid(), source_camera.client_id
    )
    ON CONFLICT (switch_id, port_number) DO UPDATE
    SET device_type = 'camera', device_id = EXCLUDED.device_id,
        device_name = EXCLUDED.device_name, updated_at = now();
  END IF;

  UPDATE public.cameras
  SET dvr_id = p_dvr_id, channel_number = p_channel_number,
      balun_id = p_balun_id, balun_port = p_balun_port,
      switch_id = p_switch_id, switch_port = p_switch_port,
      updated_at = now()
  WHERE id = source_camera.id;

  RETURN QUERY SELECT source_camera.id, displaced_camera.id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_camera_connections(uuid,uuid,integer,uuid,integer,uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_camera_connections(uuid,uuid,integer,uuid,integer,uuid,integer) TO authenticated;

INSERT INTO public.app_schema_releases (version, description)
VALUES ('2026.08.24.2', 'Vinculos transacionais de camera, DVR, Power Balun e switch')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

COMMIT;
