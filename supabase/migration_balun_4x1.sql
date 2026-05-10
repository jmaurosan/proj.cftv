-- Migration para adicionar suporte a saídas 4x1 em Power Baluns
-- Cada saída 4x1 agrupa 4 câmeras (entradas 1-4, 5-8, 9-12, 13-16)

-- Tabela para gerenciar saídas 4x1 dos Power Baluns
CREATE TABLE IF NOT EXISTS balun_4x1_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  balun_id UUID NOT NULL REFERENCES power_baluns(id) ON DELETE CASCADE,
  output_number INTEGER NOT NULL,
  channel_start INTEGER NOT NULL,
  channel_end INTEGER NOT NULL,
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(balun_id, output_number)
);

-- Adicionar coluna output_id na balun_ports para referenciar a saída 4x1
ALTER TABLE balun_ports ADD COLUMN IF NOT EXISTS output_id UUID REFERENCES balun_4x1_outputs(id) ON DELETE SET NULL;

-- Comentários para documentação
COMMENT ON TABLE balun_4x1_outputs IS 'Saídas 4x1 dos Power Baluns - cada saída agrupa 4 câmeras';
COMMENT ON COLUMN balun_4x1_outputs.output_number IS 'Número da saída 4x1 (1, 2, 3 ou 4)';
COMMENT ON COLUMN balun_4x1_outputs.channel_start IS 'Porta inicial do grupo (1, 5, 9 ou 13)';
COMMENT ON COLUMN balun_4x1_outputs.channel_end IS 'Porta final do grupo (4, 8, 12 ou 16)';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_balun_4x1_outputs_balun ON balun_4x1_outputs(balun_id);
CREATE INDEX IF NOT EXISTS idx_balun_ports_output ON balun_ports(output_id);