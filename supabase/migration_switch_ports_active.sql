-- Adicionar coluna is_active na tabela switch_ports para marcar portas ativas/inativas
ALTER TABLE switch_ports ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Comentário para documentação
COMMENT ON COLUMN switch_ports.is_active IS 'Indica se a porta está ativa (true) ou desativada (false)';

-- Remover ip_address da tabela switches (switches não gerenciáveis não têm IP)
ALTER TABLE switches DROP COLUMN IF EXISTS ip_address;