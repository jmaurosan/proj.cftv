BEGIN;

ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS recording_codec text,
  ADD COLUMN IF NOT EXISTS recording_fps numeric,
  ADD COLUMN IF NOT EXISTS recording_bitrate_kbps numeric,
  ADD COLUMN IF NOT EXISTS recording_mode text,
  ADD COLUMN IF NOT EXISTS motion_recording_percent numeric;

ALTER TABLE public.cameras DROP CONSTRAINT IF EXISTS cameras_recording_codec_check;
ALTER TABLE public.cameras ADD CONSTRAINT cameras_recording_codec_check
  CHECK (recording_codec IS NULL OR recording_codec IN ('h264','h265','h265_plus'));

ALTER TABLE public.cameras DROP CONSTRAINT IF EXISTS cameras_recording_fps_check;
ALTER TABLE public.cameras ADD CONSTRAINT cameras_recording_fps_check
  CHECK (recording_fps IS NULL OR recording_fps BETWEEN 1 AND 60);

ALTER TABLE public.cameras DROP CONSTRAINT IF EXISTS cameras_recording_bitrate_check;
ALTER TABLE public.cameras ADD CONSTRAINT cameras_recording_bitrate_check
  CHECK (recording_bitrate_kbps IS NULL OR recording_bitrate_kbps > 0);

ALTER TABLE public.cameras DROP CONSTRAINT IF EXISTS cameras_recording_mode_check;
ALTER TABLE public.cameras ADD CONSTRAINT cameras_recording_mode_check
  CHECK (recording_mode IS NULL OR recording_mode IN ('continuous','motion'));

ALTER TABLE public.cameras DROP CONSTRAINT IF EXISTS cameras_motion_recording_percent_check;
ALTER TABLE public.cameras ADD CONSTRAINT cameras_motion_recording_percent_check
  CHECK (motion_recording_percent IS NULL OR motion_recording_percent BETWEEN 1 AND 100);

UPDATE public.cameras SET
  recording_codec = COALESCE(recording_codec, 'h265'),
  recording_fps = COALESCE(recording_fps, 15),
  recording_mode = COALESCE(recording_mode, 'continuous'),
  motion_recording_percent = COALESCE(motion_recording_percent, 35);

INSERT INTO public.app_schema_releases (version, description)
VALUES ('2026.08.25.2', 'Parametros por camera para calculo de armazenamento e retencao')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

COMMIT;
