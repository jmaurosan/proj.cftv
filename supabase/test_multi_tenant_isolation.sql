-- ============================================================
-- Testes de isolamento multi-tenant
-- ============================================================
-- Rode APÓS aplicar as Fases 1, 2 e 3.
-- Este script simula diferentes users e valida o que cada um vê.
--
-- Não altera nenhum dado — tudo dentro de BEGIN/ROLLBACK.
--
-- Como funciona: `SET LOCAL request.jwt.claims` engana as funções
-- auth.uid() e auth.jwt() do Supabase pra retornar valores fake.
-- ============================================================

BEGIN;

SET LOCAL ROLE authenticated;

-- ============================================================
-- TESTE 1: mauro (admin) — deve ver TUDO
-- ============================================================
SET LOCAL request.jwt.claims TO '{"sub":"cf45d049-bf1b-443c-b4a3-e71853f4818b","role":"authenticated","app_metadata":{"role":"admin"}}';

SELECT
  'admin_mauro' AS user_context,
  (SELECT count(*) FROM dvrs) AS dvrs,
  (SELECT count(*) FROM cameras) AS cameras,
  (SELECT count(*) FROM clients) AS clients,
  (SELECT count(*) FROM credentials) AS credentials,
  (SELECT count(*) FROM power_baluns) AS baluns,
  (SELECT count(*) FROM switches) AS switches;
-- Esperado: 6 dvrs, 51 cameras, 2 clients, 5 credentials, 4 baluns, 2 switches

SELECT 'is_admin() para mauro:' AS check, is_admin();
-- Esperado: true

-- ============================================================
-- TESTE 2: user sem nenhum membership — deve ver ZERO em tudo
-- ============================================================
SET LOCAL request.jwt.claims TO '{"sub":"00000000-0000-0000-0000-000000000099","role":"authenticated","app_metadata":{}}';

SELECT
  'user_sem_acesso' AS user_context,
  (SELECT count(*) FROM dvrs) AS dvrs,
  (SELECT count(*) FROM cameras) AS cameras,
  (SELECT count(*) FROM clients) AS clients,
  (SELECT count(*) FROM credentials) AS credentials,
  (SELECT count(*) FROM power_baluns) AS baluns,
  (SELECT count(*) FROM switches) AS switches;
-- Esperado: 0 em todas (isolamento funciona)

SELECT 'is_admin() para user sem acesso:' AS check, is_admin();
-- Esperado: false

-- ============================================================
-- TESTE 3: síndico simulado com acesso APENAS ao Monet
-- ============================================================
-- Popula membership temporária (será desfeita no ROLLBACK)
INSERT INTO client_members (user_id, client_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000088'::uuid,
  '821d6743-8b15-4a42-b24d-2cab834c852e'::uuid,  -- CONDOMINIO EDIFICIO MONET
  'viewer'
);

SET LOCAL request.jwt.claims TO '{"sub":"00000000-0000-0000-0000-000000000088","role":"authenticated","app_metadata":{}}';

SELECT
  'sindico_monet' AS user_context,
  (SELECT count(*) FROM dvrs) AS dvrs,
  (SELECT count(*) FROM cameras) AS cameras,
  (SELECT count(*) FROM clients) AS clients,
  (SELECT count(*) FROM credentials) AS credentials,
  (SELECT count(*) FROM power_baluns) AS baluns,
  (SELECT count(*) FROM switches) AS switches;
-- Esperado: só as linhas cujo client_id = MONET
-- (número variável, mas > 0 em cameras e < total)

SELECT 'is_admin() para sindico:' AS check, is_admin();
-- Esperado: false

-- Verifica que síndico NÃO vê nada do outro cliente
SELECT
  'sindico_ve_digixs?' AS check,
  count(*) AS deveria_ser_zero
FROM cameras
WHERE client_id = '7b73837d-5075-44c8-9fe5-f2d99014591c';  -- DIGIXS
-- Esperado: 0

-- ============================================================
-- TESTE 4: user_has_client_access() funciona?
-- ============================================================
SELECT
  'access_monet' AS check,
  user_has_client_access('821d6743-8b15-4a42-b24d-2cab834c852e') AS should_be_true;
-- Esperado: true (síndico tem membership no Monet)

SELECT
  'access_digixs' AS check,
  user_has_client_access('7b73837d-5075-44c8-9fe5-f2d99014591c') AS should_be_false;
-- Esperado: false (síndico não tem membership no DIGIXS)

-- ============================================================
-- ROLLBACK: desfaz insert de membership e reseta claims
-- ============================================================
ROLLBACK;

-- ============================================================
-- Interpretação dos resultados
-- ============================================================
-- ✅ TUDO OK se:
--   - Test 1: admin vê números altos (todos os dados)
--   - Test 2: user sem acesso vê 0 em tudo
--   - Test 3: síndico vê apenas dados do Monet, count < admin
--   - Test 4: access_monet=true, access_digixs=false
--
-- ❌ RLS QUEBRADO se:
--   - Test 2 retorna qualquer número > 0 → policy tá aberta demais
--   - Test 3 retorna dados do DIGIXS → isolamento falhou
--   - Test 4 access_digixs=true → helper com bug
