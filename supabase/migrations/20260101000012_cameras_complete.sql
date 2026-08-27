-- ============================================
-- Migration: Recriar tabela cameras com TODAS as colunas
-- Execute no projeto CFTV do Supabase
-- ============================================

-- Verifica se a tabela cameras existe e quais colunas tem
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT count(*) INTO col_count 
  FROM information_schema.columns 
  WHERE table_name = 'cameras' AND table_schema = 'public';
  
  RAISE NOTICE 'Tabela cameras tem % colunas', col_count;
  
  IF col_count < 5 THEN
    RAISE NOTICE 'Tabela cameras parece estar incompleta, recriando...';
  END IF;
END $$;

-- Migration completa para criar/adicionar TODAS as colunas da tabela cameras
-- Usa CREATE TABLE IF NOT EXISTS trick para adicionar colunas safely

DO $$
BEGIN
  -- Coluna: brand (marca da câmera)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'brand') THEN
    ALTER TABLE cameras ADD COLUMN brand varchar(100);
    RAISE NOTICE 'Coluna brand adicionada';
  END IF;
  
  -- Coluna: connection_type (tipo de conexão: analogica ou ip)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'connection_type') THEN
    ALTER TABLE cameras ADD COLUMN connection_type varchar(20) NOT NULL DEFAULT 'analogica';
    RAISE NOTICE 'Coluna connection_type adicionada';
  END IF;
  
  -- Coluna: ip_address
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'ip_address') THEN
    ALTER TABLE cameras ADD COLUMN ip_address varchar(45);
    RAISE NOTICE 'Coluna ip_address adicionada';
  END IF;
  
  -- Coluna: mac_address
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'mac_address') THEN
    ALTER TABLE cameras ADD COLUMN mac_address varchar(17);
    RAISE NOTICE 'Coluna mac_address adicionada';
  END IF;
  
  -- Coluna: poe_powered
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'poe_powered') THEN
    ALTER TABLE cameras ADD COLUMN poe_powered boolean NOT NULL DEFAULT false;
    RAISE NOTICE 'Coluna poe_powered adicionada';
  END IF;
  
  -- Coluna: type (tipo de câmera: dome, bullet, etc)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'type') THEN
    ALTER TABLE cameras ADD COLUMN type varchar(30) NOT NULL DEFAULT 'dome';
    RAISE NOTICE 'Coluna type adicionada';
  END IF;
  
  -- Coluna: status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'status') THEN
    ALTER TABLE cameras ADD COLUMN status varchar(20) NOT NULL DEFAULT 'ativo';
    RAISE NOTICE 'Coluna status adicionada';
  END IF;
  
  -- Coluna: resolution
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'resolution') THEN
    ALTER TABLE cameras ADD COLUMN resolution varchar(20);
    RAISE NOTICE 'Coluna resolution adicionada';
  END IF;
  
  -- Coluna: rtsp_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'rtsp_url') THEN
    ALTER TABLE cameras ADD COLUMN rtsp_url varchar(500);
    RAISE NOTICE 'Coluna rtsp_url adicionada';
  END IF;
  
  -- Coluna: balun_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'balun_id') THEN
    ALTER TABLE cameras ADD COLUMN balun_id uuid REFERENCES power_baluns(id) ON DELETE SET NULL;
    RAISE NOTICE 'Coluna balun_id adicionada';
  END IF;
  
  -- Coluna: balun_port
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'balun_port') THEN
    ALTER TABLE cameras ADD COLUMN balun_port smallint;
    RAISE NOTICE 'Coluna balun_port adicionada';
  END IF;
  
  -- Coluna: switch_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'switch_id') THEN
    ALTER TABLE cameras ADD COLUMN switch_id uuid REFERENCES switches(id) ON DELETE SET NULL;
    RAISE NOTICE 'Coluna switch_id adicionada';
  END IF;
  
  -- Coluna: switch_port
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'switch_port') THEN
    ALTER TABLE cameras ADD COLUMN switch_port smallint;
    RAISE NOTICE 'Coluna switch_port adicionada';
  END IF;
  
  -- Coluna: qr_code_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'qr_code_url') THEN
    ALTER TABLE cameras ADD COLUMN qr_code_url varchar(500);
    RAISE NOTICE 'Coluna qr_code_url adicionada';
  END IF;
  
  -- Coluna: notes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'notes') THEN
    ALTER TABLE cameras ADD COLUMN notes text;
    RAISE NOTICE 'Coluna notes adicionada';
  END IF;
  
  -- Coluna: user_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'user_id') THEN
    ALTER TABLE cameras ADD COLUMN user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Coluna user_id adicionada';
  END IF;
  
  -- Coluna: created_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'created_at') THEN
    ALTER TABLE cameras ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
    RAISE NOTICE 'Coluna created_at adicionada';
  END IF;
  
  -- Coluna: updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'updated_at') THEN
    ALTER TABLE cameras ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
    RAISE NOTICE 'Coluna updated_at adicionada';
  END IF;
  
  -- Coluna: client_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cameras' AND column_name = 'client_id') THEN
    ALTER TABLE cameras ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
    RAISE NOTICE 'Coluna client_id adicionada';
  END IF;
  
  RAISE NOTICE 'Todas as colunas da tabela cameras foram verificadas/adicionadas!';
END $$;

-- Resultado final
SELECT 
  'Tabela cameras agora tem as seguintes colunas:' as status,
  column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cameras' AND table_schema = 'public'
ORDER BY ordinal_position;
ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS model varchar(100);
