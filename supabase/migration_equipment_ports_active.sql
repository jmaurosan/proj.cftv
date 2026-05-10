-- Adicionar coluna is_active à tabela balun_ports
ALTER TABLE balun_ports ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Criar tabela para rastrear canais do DVR individualmente
CREATE TABLE IF NOT EXISTS dvr_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dvr_id UUID NOT NULL REFERENCES dvrs(id) ON DELETE CASCADE,
  channel_number INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dvr_id, channel_number)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_dvr_channels_dvr ON dvr_channels(dvr_id);
CREATE INDEX IF NOT EXISTS idx_balun_ports_balun ON balun_ports(balun_id);

-- Comentários para documentação
COMMENT ON COLUMN balun_ports.is_active IS 'Indica se a porta do power balun está ativa';
COMMENT ON TABLE dvr_channels IS 'Canais individuais do DVR para controle de ativo/inativo e observações';
COMMENT ON COLUMN dvr_channels.is_active IS 'Indica se o canal do DVR está ativo ou desativado (problema, manutenção, etc.)';
COMMENT ON COLUMN dvr_channels.notes IS 'Observações sobre problemas ou configurações específicas do canal';