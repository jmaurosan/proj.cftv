-- Adiciona tipo de conexão 'wifi' para câmeras Wi-Fi independentes
-- Câmeras Wi-Fi são como câmeras IP mas não requerem DVR/NVR obrigatoriamente
-- Exemplos: Intelbras Mibo, Hikvision Wi-Fi, etc.

-- Adiciona valor 'wifi' ao check constraint se existir
DO $$
BEGIN
  -- Remove constraint antigo se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'cameras_connection_type_check'
    AND table_name = 'cameras'
  ) THEN
    ALTER TABLE cameras DROP CONSTRAINT cameras_connection_type_check;
  END IF;
  
  -- Cria novo constraint com 'wifi' incluído
  ALTER TABLE cameras ADD CONSTRAINT cameras_connection_type_check
    CHECK (connection_type IN ('analogica', 'ip', 'wifi'));
END $$;

-- Atualiza câmeras existentes sem tipo para 'analogica'
UPDATE cameras SET connection_type = 'analogica' WHERE connection_type IS NULL;
