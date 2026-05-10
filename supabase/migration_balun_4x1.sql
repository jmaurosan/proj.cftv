-- Tabela para gerenciar saídas 4x1 dos Power Baluns
-- Cada saída 4x1 agrupa 4 câmeras (entradas 1-4, 5-8, 9-12, 13-16)
CREATE TABLE IF NOT EXISTS balun_4x1_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  balun_id UUID NOT NULL REFERENCES power_baluns(id) ON DELETE CASCADE,
  output_number INTEGER NOT NULL, -- 1, 2, 3 ou 4 (4x1-1, 4x1-2, etc)
  channel_start INTEGER NOT NULL, -- 1, 5, 9 ou 13 (início do grupo de 4 canais)
  channel_end INTEGER NOT NULL, -- 4, 8, 12 ou 16 (fim do grupo)
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(balun_id, output_number)
);

-- Atualizar tabela balun_ports para incluir referência à saída 4x1
ALTER TABLE balun_ports ADD COLUMN IF NOT EXISTS output_id UUID REFERENCES balun_4x1_outputs(id) ON DELETE SET NULL;

-- Comentários
COMMENT ON TABLE balun_4x1_outputs IS 'Saídas 4x1 dos Power Baluns - cada saída agrupa 4 câmeras (entradas 1-4, 5-8, etc)';
COMMENT ON COLUMN balun_4x1_outputs.output_number IS 'Número da saída 4x1 (1, 2, 3 ou 4)';
COMMENT ON COLUMN balun_4x1_outputs.channel_start IS 'Porta inicial do grupo (1, 5, 9 ou 13)';
COMMENT ON COLUMN balun_4x1_outputs.channel_end IS 'Porta final do grupo (4, 8, 12 ou 16)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_balun_4x1_outputs_balun ON balun_4x1_outputs(balun_id);
CREATE INDEX IF NOT EXISTS idx_balun_ports_output ON balun_ports(output_id);