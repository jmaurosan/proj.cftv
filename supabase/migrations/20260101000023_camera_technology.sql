-- Tecnologia da câmera: Multi HD, HDCVI, AHD, IP/ONVIF, Wi-Fi Smart, Full Color etc.
-- Mantém câmeras existentes sem valor até a próxima edição do cadastro.

ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS technology TEXT;
