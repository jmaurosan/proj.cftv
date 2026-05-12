-- Migration para adicionar políticas RLS na tabela balun_ports

-- Habilitar RLS na tabela balun_ports
ALTER TABLE balun_ports ENABLE ROW LEVEL SECURITY;

-- Política para permitir SELECT (visualizar portas)
CREATE POLICY "Permitir visualização das portas do balun"
ON balun_ports FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política para permitir INSERT (criar/atualizar portas)
CREATE POLICY "Permitir inserir portas do balun"
ON balun_ports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política para permitir UPDATE (atualizar portas)
CREATE POLICY "Permitir atualizar portas do balun"
ON balun_ports FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Política para permitir DELETE (remover portas)
CREATE POLICY "Permitir deletar portas do balun"
ON balun_ports FOR DELETE
TO authenticated
USING (auth.uid() = user_id);