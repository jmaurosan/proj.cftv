-- Troca atomica de camera entre DVR/canal.
-- A funcao bloqueia as linhas envolvidas e conclui tudo em uma transacao.

BEGIN;

CREATE OR REPLACE FUNCTION public.move_camera_to_dvr_channel(
  p_camera_id uuid,
  p_target_dvr_id uuid,
  p_target_channel integer
)
RETURNS TABLE (camera_id uuid, displaced_camera_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_camera public.cameras%ROWTYPE;
  displaced_camera public.cameras%ROWTYPE;
BEGIN
  SELECT * INTO source_camera
  FROM public.cameras
  WHERE id = p_camera_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Camera nao encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.user_has_client_role(source_camera.client_id, ARRAY['owner','operator']) THEN
    RAISE EXCEPTION 'Sem permissao para mover esta camera.' USING ERRCODE = '42501';
  END IF;

  IF (p_target_dvr_id IS NULL) <> (p_target_channel IS NULL) THEN
    RAISE EXCEPTION 'DVR e canal devem ser informados juntos.' USING ERRCODE = '22023';
  END IF;

  IF p_target_channel IS NOT NULL AND p_target_channel < 1 THEN
    RAISE EXCEPTION 'O canal deve ser maior que zero.' USING ERRCODE = '22023';
  END IF;

  IF p_target_dvr_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.dvrs d
    WHERE d.id = p_target_dvr_id AND d.client_id = source_camera.client_id
  ) THEN
    RAISE EXCEPTION 'DVR nao pertence ao mesmo projeto da camera.' USING ERRCODE = '22023';
  END IF;

  IF source_camera.dvr_id IS NOT DISTINCT FROM p_target_dvr_id
     AND source_camera.channel_number IS NOT DISTINCT FROM p_target_channel THEN
    RETURN QUERY SELECT source_camera.id, NULL::uuid;
    RETURN;
  END IF;

  IF p_target_dvr_id IS NOT NULL THEN
    SELECT * INTO displaced_camera
    FROM public.cameras
    WHERE dvr_id = p_target_dvr_id
      AND channel_number = p_target_channel
      AND id <> source_camera.id
    FOR UPDATE;
  END IF;

  -- Libera primeiro a origem para respeitar o indice unico durante a troca.
  UPDATE public.cameras
  SET dvr_id = NULL, channel_number = NULL, updated_at = now()
  WHERE id = source_camera.id;

  IF displaced_camera.id IS NOT NULL THEN
    UPDATE public.cameras
    SET dvr_id = source_camera.dvr_id,
        channel_number = source_camera.channel_number,
        updated_at = now()
    WHERE id = displaced_camera.id;
  END IF;

  UPDATE public.cameras
  SET dvr_id = p_target_dvr_id,
      channel_number = p_target_channel,
      updated_at = now()
  WHERE id = source_camera.id;

  RETURN QUERY SELECT source_camera.id, displaced_camera.id;
END;
$$;

REVOKE ALL ON FUNCTION public.move_camera_to_dvr_channel(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_camera_to_dvr_channel(uuid, uuid, integer) TO authenticated;

COMMIT;
