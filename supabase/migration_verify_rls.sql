-- ============================================
-- Verificação das Políticas RLS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Políticas por tabela
SELECT 
  tablename AS tabela,
  policyname AS politica,
  cmd AS operacao,
  CASE cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'u' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END AS operacao_desc,
  qual AS condicao_usuario,
  with_check AS condicao_insercao
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Resumo por tabela
SELECT 
  tablename AS tabela,
  count(*) AS total_politicas,
  string_agg(CASE cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'u' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END, ', ') AS operacoes
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Tabelas sem RLS habilitada (se houver)
SELECT 
  tablename AS tabela_sem_rls
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  )
ORDER BY tablename;
