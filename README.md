# CFTV.PROJ

Plataforma web para projeto, inventário, documentação, comissionamento e manutenção de instalações de CFTV. O sistema relaciona clientes, locais, câmeras, DVRs/NVRs, canais, switches, Power Baluns, racks, alimentação, mídias e topologia física.

## Tecnologias

- React 19, TypeScript e Vite
- Tailwind CSS
- Supabase (PostgreSQL, autenticação, RLS e Storage privado)
- Vercel
- PWA e agente local opcional para MediaMTX

## Desenvolvimento

1. Copie `.env.example` para `.env.local`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com um ambiente autorizado.
3. Instale e execute:

```bash
npm install
npm run dev
```

Nunca reutilize dados, credenciais ou arquivos da produção em ambientes de teste ou demonstração.

## Verificação

```bash
npm run verify
```

O comando executa lint, os testes automatizados e o build de produção.

## Estrutura

- `src/pages`: superfícies acessadas pelas rotas.
- `src/components`: componentes, formulários, layout e UI compartilhada.
- `src/hooks`: estado e operações de dados por domínio.
- `src/services`: Supabase, Storage e integrações.
- `src/lib`: regras de negócio puras e utilitários testáveis.
- `tests`: testes unitários e de contrato.
- `supabase`: migrations, políticas RLS e verificações do banco.
- `tools`: ferramentas locais, incluindo o agente MediaMTX.
- `docs`: arquitetura, produto, implantação e arquivos históricos.

A evolução para uma organização por funcionalidades deve ser incremental. Consulte [a arquitetura](docs/architecture/README.md) antes de mover módulos.

## Produção e demonstração

- Produção: banco e projeto Vercel exclusivos para dados reais.
- Demonstração: banco, autenticação, Storage e projeto Vercel separados, preenchidos somente com dados fictícios.

O procedimento seguro está em [docs/demo/README.md](docs/demo/README.md).

## Documentação

- [Arquitetura e organização](docs/architecture/README.md)
- [Ambiente demonstrativo](docs/demo/README.md)
- [Requisitos do produto](docs/product/PRD.md)
- [Roadmap](docs/product/roadmap.md)
- [Aplicação das migrations](supabase/DEPLOY_20260826.md)
