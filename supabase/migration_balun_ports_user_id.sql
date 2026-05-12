-- Migration para adicionar user_id na tabela balun_ports (se não existir)
-- Necessário para RLS funcionar corretamente

-- Adicionar coluna user_id se não existir
ALTER TABLE balun_ports ADD COLUMN IF NOT EXISTS user_id UUID;

-- Migração: atualizar registros existentes com um user_id padrão (primeiro usuário)
UPDATE balun_ports 
SET user_id = COALESCE(user_id, (
  SELECT id FROM auth.users LIMIT 1
))
WHERE user_id IS NULL;