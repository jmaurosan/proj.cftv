---
name: cftv-frontend-design
description: Melhorar incrementalmente o frontend do CFTV.PROJ com padrões visuais profissionais, responsivos e acessíveis, preservando rotas, regras de negócio, persistência, permissões e vínculos existentes. Use em páginas, formulários, inventários, topologia e ambientes de demonstração deste projeto.
---

# Frontend profissional e incremental do CFTV.PROJ

Trate o produto como ferramenta operacional de segurança eletrônica. O técnico deve localizar equipamentos, canais, portas, IPs, alertas e ações rapidamente em desktop e celular.

## Contrato de preservação

- Faça mudanças incrementais; não reescreva páginas inteiras quando composição e estilos resolvem o pedido.
- Preserve IDs, colunas, payloads, hooks, rotas, RLS, papéis e vínculos persistidos, salvo pedido funcional explícito.
- Pesquise importadores antes de remover ou renomear componentes.
- Mudança visual não autoriza migration, alteração de registros ou flexibilização de permissões.
- Reuse `src/components/ui`, tokens de `src/index.css` e padrões do layout atual.

## Direção visual

- Use base sóbria em grafite ou azul-petróleo, bordas discretas e contraste suficiente.
- Reserve ciano/azul para navegação; verde, âmbar e vermelho apenas para estados reais.
- Evite brilho neon, gradientes decorativos, animações sem função, excesso de cartões e microtextos.
- Use fonte monoespaçada para IPs, canais, portas, seriais e valores técnicos.
- Ícones devem comunicar uma ação ou tipo de equipamento.

## Fluxos operacionais

- Agrupe navegação por trabalho: Visão geral, Projeto, Equipamentos, Campo e operação, Documentação e Administração.
- Preserve o cliente selecionado e ofereça troca explícita.
- Em celular, prefira cartões compactos e atalhos por canal/porta; não force tabelas largas.
- Mostre apenas campos compatíveis com a tecnologia do equipamento.
- Mantenha uma ação principal clara e ações destrutivas protegidas por confirmação.

## Estados e acessibilidade

- Toda tela de dados distingue: carregando, vazio, erro, sem cliente e sem permissão.
- Não exponha respostas brutas, tokens, caminhos privados ou detalhes internos em erros.
- Valide foco por teclado, contraste, rótulos, alvos de toque e largura próxima de 390 px.
- Valide desktop com barra lateral aberta e recolhida.

## Topologia

- Trate o diagrama como documentação e diagnóstico, não como tela principal.
- Use área ampla, tela cheia e painéis recolhíveis.
- Agrupe instalações grandes por rack, local, DVR ou switch.
- Nunca invente conexões quando não houver vínculo persistido.

## Somente leitura e demonstração

- O demo “Residencial Digixs” usa Supabase, Storage, autenticação e Vercel separados.
- Nunca copie dados, imagens, QR Codes, contatos, IPs, documentos, backups, variáveis ou credenciais da produção.
- O visitante usa `viewer`: comunique “Somente leitura” e remova ações de mutação, mas mantenha o bloqueio real no banco.
- Não coloque senha, sessão automática, `service_role` ou chave privilegiada no frontend.
- Compartilhe componentes entre produção e demo para evitar bifurcação permanente do produto.

## Processo de alteração

1. Identifique a tarefa principal e os dados necessários em campo.
2. Registre o comportamento que deve permanecer igual.
3. Reuse componentes e tokens antes de criar novos padrões.
4. Implemente estados responsivos, vazios, erro e permissão.
5. Execute lint, testes e build.
6. Valide a rota autenticada em desktop e celular e verifique o console.

## Limites

- Não redesenhe todo o aplicativo durante uma correção localizada.
- Não esconda densidade técnica necessária por estética.
- Não transforme ocultação de botões em autorização.
- Não altere multi-tenant, credenciais ou vínculos por ID sem escopo explícito e testes próprios.
