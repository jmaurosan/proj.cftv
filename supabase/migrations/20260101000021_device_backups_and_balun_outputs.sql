-- ========================================================
-- MIGRATION: device_backups & balun_4x1_outputs
-- Criação de tabelas pendentes de armazenamento e suporte 4x1
-- ========================================================

-- ========================================================
-- 1. TABELA: balun_4x1_outputs
-- ========================================================
CREATE TABLE IF NOT EXISTS balun_4x1_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  balun_id UUID NOT NULL REFERENCES power_baluns(id) ON DELETE CASCADE,
  output_number INTEGER NOT NULL,
  channel_start INTEGER NOT NULL,
  channel_end INTEGER NOT NULL,
  notes TEXT,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_balun_4x1_outputs_balun_output UNIQUE(balun_id, output_number)
);

-- Habilitar RLS
ALTER TABLE balun_4x1_outputs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para balun_4x1_outputs
DROP POLICY IF EXISTS "Users can view own balun 4x1 outputs" ON balun_4x1_outputs;
DROP POLICY IF EXISTS "Users can insert own balun 4x1 outputs" ON balun_4x1_outputs;
DROP POLICY IF EXISTS "Users can update own balun 4x1 outputs" ON balun_4x1_outputs;
DROP POLICY IF EXISTS "Users can delete own balun 4x1 outputs" ON balun_4x1_outputs;

CREATE POLICY "Users can view own balun 4x1 outputs" ON balun_4x1_outputs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own balun 4x1 outputs" ON balun_4x1_outputs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own balun 4x1 outputs" ON balun_4x1_outputs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own balun 4x1 outputs" ON balun_4x1_outputs FOR DELETE USING (auth.uid() = user_id);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_balun_4x1_outputs_balun ON balun_4x1_outputs(balun_id);
CREATE INDEX IF NOT EXISTS idx_balun_4x1_outputs_user ON balun_4x1_outputs(user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_balun_4x1_outputs_updated_at ON balun_4x1_outputs;

CREATE TRIGGER trigger_balun_4x1_outputs_updated_at
  BEFORE UPDATE ON balun_4x1_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ========================================================
-- 2. TABELA: device_backups
-- ========================================================
CREATE TABLE IF NOT EXISTS device_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  equipment_type VARCHAR(20) NOT NULL CHECK (equipment_type IN ('router', 'switch', 'dvr')),
  equipment_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  notes TEXT,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE device_backups ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para device_backups
DROP POLICY IF EXISTS "Users can view own device backups" ON device_backups;
DROP POLICY IF EXISTS "Users can insert own device backups" ON device_backups;
DROP POLICY IF EXISTS "Users can update own device backups" ON device_backups;
DROP POLICY IF EXISTS "Users can delete own device backups" ON device_backups;

CREATE POLICY "Users can view own device backups" ON device_backups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own device backups" ON device_backups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own device backups" ON device_backups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own device backups" ON device_backups FOR DELETE USING (auth.uid() = user_id);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_device_backups_equipment ON device_backups(equipment_id);
CREATE INDEX IF NOT EXISTS idx_device_backups_user ON device_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_device_backups_client ON device_backups(client_id);


-- ========================================================
-- 3. BUCKET DE STORAGE: device-backups
-- ========================================================

-- Insere o bucket se ele não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('device-backups', 'device-backups', false)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET public = false
WHERE id = 'device-backups';

-- Políticas de Storage para o bucket 'device-backups'
-- (Exclui políticas antigas se existirem para evitar conflito)
DROP POLICY IF EXISTS "Allow public select on backups" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert on backups" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete on backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can select own private backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own private backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own private backups" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own private backups" ON storage.objects;

CREATE POLICY "Users can select own private backups" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'device-backups'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
        AND EXISTS (
          SELECT 1 FROM public.clients
          WHERE clients.id = split_part(name, '/', 2)::uuid
          AND clients.user_id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.device_backups
        WHERE device_backups.file_path = storage.objects.name
        AND device_backups.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert own private backups" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'device-backups'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
        AND EXISTS (
          SELECT 1 FROM public.clients
          WHERE clients.id = split_part(name, '/', 2)::uuid
          AND clients.user_id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.device_backups
        WHERE device_backups.file_path = storage.objects.name
        AND device_backups.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own private backups" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'device-backups'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
        AND EXISTS (
          SELECT 1 FROM public.clients
          WHERE clients.id = split_part(name, '/', 2)::uuid
          AND clients.user_id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.device_backups
        WHERE device_backups.file_path = storage.objects.name
        AND device_backups.user_id = auth.uid()
      )
    )
  ) WITH CHECK (
    bucket_id = 'device-backups'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
        AND EXISTS (
          SELECT 1 FROM public.clients
          WHERE clients.id = split_part(name, '/', 2)::uuid
          AND clients.user_id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.device_backups
        WHERE device_backups.file_path = storage.objects.name
        AND device_backups.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete own private backups" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'device-backups'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR (
        split_part(name, '/', 1) IN ('documents', 'media')
        AND split_part(name, '/', 2) ~* '^[0-9a-f-]{36}$'
        AND EXISTS (
          SELECT 1 FROM public.clients
          WHERE clients.id = split_part(name, '/', 2)::uuid
          AND clients.user_id = auth.uid()
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.device_backups
        WHERE device_backups.file_path = storage.objects.name
        AND device_backups.user_id = auth.uid()
      )
    )
  );
