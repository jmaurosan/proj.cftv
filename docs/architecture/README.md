# Arquitetura e organização

## Estado atual

O frontend usa uma separação por camada (`pages`, `components`, `hooks`, `services` e `lib`). Esse formato é adequado para módulos pequenos e deve continuar funcionando durante a transição.

Arquivos grandes devem ser divididos somente quando houver testes para a regra extraída. Não faça uma mudança global de pastas: ela gera conflitos, quebra imports e dificulta identificar regressões.

## Estrutura-alvo

```text
src/
  app/                  rotas, providers e layout global
  features/
    cameras/            UI, hooks, serviços e tipos exclusivos de câmeras
    dvrs/               DVRs, canais e Hik-Connect
    topology/           layout, vínculos e apresentação da topologia
    documents-media/    biblioteca, previews e anexos privados
    diagnostics/        diagnóstico e histórico
  shared/
    ui/                 componentes visuais reutilizáveis
    hooks/              hooks realmente compartilhados
    lib/                regras puras usadas por vários domínios
    types/              contratos transversais
```

## Regras de decisão

- Código usado por uma única funcionalidade pertence à respectiva pasta em `features`.
- Código usado por três ou mais funcionalidades pode ir para `shared`.
- Página coordena dados e composição; regra de negócio testável não deve ficar na página.
- Acesso ao Supabase fica em hooks ou serviços, nunca dentro de componentes puramente visuais.
- Tipos do banco e IDs persistidos não devem ser recriados durante uma reorganização.
- Cada migração de módulo precisa preservar rotas, comportamento e testes existentes.

## Ordem recomendada de evolução

1. Topologia: separar carregamento, editor de racks, grafo e apresentação.
2. Câmeras: separar formulário por tecnologia, galeria e conexões.
3. Formulários legados compartilhados.
4. Documentos e mídias.
5. Demais inventários.

## Banco

Novas migrations devem usar `supabase/migrations/YYYYMMDDHHMMSS_descricao.sql`. Os arquivos históricos continuam preservados na raiz de `supabase` até uma consolidação testada em um banco vazio. Verificações e seeds devem ficar separados das migrations de produção.
