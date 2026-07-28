# Plano 001: Transformar a topologia física em diagrama automático apresentável

> **Instruções ao executor**: siga este plano passo a passo. Execute cada
> verificação e confirme o resultado esperado antes de avançar. Se ocorrer uma
> condição da seção "Condições de parada", pare e relate; não improvise.
>
> **Verificação de drift (execute primeiro)**:
> `git diff --stat 4f854cb..HEAD -- src/components/NetworkTopology.tsx src/lib/automaticTopology.ts src/lib/topologyLayout.ts`
> Se algum arquivo em escopo mudou desde este plano, compare os trechos de
> "Estado atual" com o código vivo antes de prosseguir.

## Status

- **Prioridade**: P1
- **Esforço**: L (entrega de vários dias, incluindo refinamento visual)
- **Risco**: MED — altera o principal modo de visualização, mas preserva dados e
  mantém um modo técnico expandido.
- **Depende de**: nenhum
- **Categoria**: direction
- **Planejado em**: commit `4f854cb`, 2026-07-27

## Por que isto importa

O mapa atual exige organização manual e desenha dezenas de ligações sobrepostas.
Em instalações reais, com DVRs e muitas câmeras, o resultado deixa de comunicar
a arquitetura do CFTV e não serve como documento para o cliente. A entrega deve
produzir automaticamente uma topologia limpa a partir dos vínculos já
cadastrados, manter as linhas presas aos equipamentos e oferecer detalhe técnico
sem poluir a visão de apresentação.

## Estado atual

- `src/components/NetworkTopology.tsx:109-149` concentra carregamento,
  persistência, layout, edição, canvas e apresentação em um único componente.
- `src/components/NetworkTopology.tsx:417-456` já converte os dados cadastrados
  em conexões automáticas e depois calcula posições.
- `src/components/NetworkTopology.tsx:465-548` agrupa equipamentos apenas pelo
  tipo e os distribui em linhas globais fixas. A ordenação pelo pai não mantém
  cada subárvore espacialmente agrupada.
- `src/components/NetworkTopology.tsx:555-607` salva posições manuais em
  `clients.notes.topologyLayout`, juntamente com preferências e conexões.
- `src/components/NetworkTopology.tsx:1779-1836` desenha uma curva Bézier do
  centro de um bloco ao centro do outro. As curvas cruzam nós, rótulos e outras
  curvas quando existem muitos destinos.
- `src/components/NetworkTopology.tsx:1847-1880` usa posições absolutas e
  `motion.div`; o arraste atualiza o bloco, mas não existe roteamento que reserve
  corredores para os cabos.
- `src/lib/automaticTopology.ts:54-130` já conhece os vínculos principais:
  Internet → roteadores, roteador → switch, switch → DVR/equipamento,
  switch → câmera IP/PoE, DVR → power balun → câmera analógica e DVR → câmera.
- O projeto usa React 19, TypeScript, Tailwind CSS 4, Motion e Lucide. Não há
  biblioteca de layout de grafos nem runner de testes configurado.
- Há alterações de outras funcionalidades no worktree. Não as formate, reverta,
  inclua no commit ou misture com esta entrega.

## Resultado de produto

A tela terá dois níveis:

1. **Apresentação** (padrão): diagrama automático, sem arraste, com colunas ou
   faixas lógicas, grupos recolhíveis de câmeras e linhas ortogonais.
2. **Técnico**: expande todos os equipamentos, portas/canais, estados e detalhes.
   O ajuste manual fica como exceção avançada, não como requisito para obter um
   mapa legível.

Fluxo visual principal:

`Internet/Operadora → Roteador/Mikrotik → Switch/Rack → DVR ou Power Balun → Câmeras`

Nobreak é proteção de energia e deve aparecer associado ao rack/equipamentos
protegidos, em uma faixa lateral de energia; não deve ser colocado no caminho
do sinal de vídeo/rede. Monitores aparecem como saída do DVR/NVR. Uma câmera IP
liga ao switch; uma câmera analógica liga ao DVR diretamente ou por power balun.

## Comandos necessários

| Finalidade | Comando | Resultado esperado |
|---|---|---|
| Estado inicial | `git status --short` | exibe mudanças existentes; nenhuma deve ser perdida |
| Lint focado | `npx eslint src/components/NetworkTopology.tsx src/lib/automaticTopology.ts src/lib/topologyLayout.ts` | exit 0 |
| Build | `npm run build` | exit 0, TypeScript e Vite sem erros |
| Revisão do escopo | `git diff -- src/components/NetworkTopology.tsx src/lib/automaticTopology.ts src/lib/topologyLayout.ts` | somente mudanças previstas |

## Escopo

**Em escopo**:

- `src/components/NetworkTopology.tsx`
- `src/lib/automaticTopology.ts`
- `src/lib/topologyLayout.ts` (criar)
- `src/lib/topologyLayout.test.ts` somente se um runner TypeScript já tiver sido
  adicionado por outro trabalho antes da execução.

**Fora de escopo**:

- Migração ou alteração de tabelas Supabase.
- Alterações nas telas de cadastro de câmera, DVR, switch, power balun ou rack.
- Alterações em Planta Baixa ou no gerador de relatórios.
- Instalar React Flow, Dagre, ELK ou outra biblioteca sem nova autorização.
- Reverter, formatar ou commitar mudanças que já estavam no worktree.

## Fluxo Git

- Branch sugerida: `codex/topologia-automatica`
- Mensagem de commit: `feat: reorganizar topologia física automaticamente`
- Não faça push, deploy ou PR sem instrução do operador.

## Etapas

### Etapa 1: extrair um modelo hierárquico determinístico

Crie `src/lib/topologyLayout.ts` com tipos puros e funções sem React:

- `buildTopologyGraph(nodes, connections)`: índice de nós, filhos por pai,
  raízes, órfãos e profundidades; deve tolerar ciclos e múltiplos pais sem loop.
- `classifyTopologyLane(node)`: classifica em `wan`, `routing`,
  `distribution`, `recording`, `transport`, `endpoints` ou `power`.
- `computeAutomaticTopologyLayout(graph, options)`: retorna posições,
  dimensões do canvas, bounds por grupo e metadados das faixas.
- Agrupe filhos pelo pai real, não apenas pelo tipo. Ordene portas e canais
  numericamente, depois nome em `pt-BR`.
- Posicione cada subárvore em uma coluna contígua. Calcule a largura de um pai
  pela soma das larguras dos seus filhos, com espaçamento mínimo entre grupos.
- Trate equipamentos sem vínculo em um grupo visual “Sem vínculo cadastrado”,
  sem inventar conexões.

Não leia nem grave Supabase nesse arquivo.

**Verifique**:
`npx eslint src/lib/topologyLayout.ts` → exit 0.

### Etapa 2: corrigir a semântica das conexões automáticas

Em `src/lib/automaticTopology.ts`:

- Preserve os vínculos explícitos de porta/canal como fonte de verdade.
- Não conecte automaticamente todo switch órfão ao primeiro roteador quando
  houver mais de um roteador; marque-o como órfão para o layout exibir.
- Não conecte automaticamente todo DVR ao primeiro switch quando o cadastro não
  indicar essa relação. A ausência de vínculo deve ficar visível.
- Produza metadados do meio físico (`wan`, `lan`, `poe`, `coaxial`, `utp-video`,
  `hdmi`, `power`) e da porta/canal quando os dados existirem.
- Elimine duplicidades e preserve estado ativo/inativo.

Se os dados atuais não oferecem um vínculo explícito DVR → switch, mantenha o
DVR em “Sem vínculo cadastrado”; não crie uma nova tabela nesta entrega.

**Verifique**:
`npx eslint src/lib/automaticTopology.ts src/lib/topologyLayout.ts` → exit 0.

### Etapa 3: substituir curvas livres por rotas ortogonais

Em `NetworkTopology.tsx`, substitua a curva Bézier por caminhos ortogonais:

- âncoras devem sair da borda do card, nunca do centro;
- cada grupo deve possuir um tronco principal e derivações curtas para os filhos;
- reserve corredores entre faixas; nenhum segmento pode atravessar um card;
- use `markerEnd` discreto para mostrar direção;
- diferencie rede/PoE, vídeo analógico e energia com no máximo três estilos,
  sempre acompanhados por legenda textual;
- rótulos de porta/canal ficam junto à derivação do destino, não no centro de
  dezenas de linhas.

Calcule os caminhos exclusivamente a partir das posições atuais. Assim, toda
mudança de posição recalcula imediatamente as linhas.

**Verifique**:
`npx eslint src/components/NetworkTopology.tsx src/lib/automaticTopology.ts src/lib/topologyLayout.ts`
→ exit 0.

### Etapa 4: criar os modos Apresentação e Técnico

Em `NetworkTopology.tsx`:

- Adicione controle segmentado `Apresentação | Técnico`, com Apresentação como
  padrão.
- Em Apresentação, agrupe câmeras irmãs por equipamento pai em cartões-resumo
  como “Câmeras CH 1–16 · 14 ativas”. Expanda o grupo sob demanda.
- Em Técnico, mostre cada câmera, porta/canal, IP, localização e estado.
- Mostre faixas com títulos: `Internet`, `Rede`, `Gravação e transporte`,
  `Pontos de câmera` e `Energia`.
- Mostre o grupo “Sem vínculo cadastrado” com ação que navega para o cadastro do
  tipo do equipamento; não esconda inconsistências.
- Adicione legenda fixa e contador de equipamentos/vínculos/pendências.
- Quando não houver dados, mostre um estado vazio instrutivo.

Não use arraste no modo Apresentação. No modo Técnico, deixe “Ajuste manual”
atrás de uma ação secundária e ofereça “Voltar ao automático”.

**Verifique**:
`npm run build` → exit 0.

### Etapa 5: compatibilizar a persistência sem migração

- Continue lendo `topologyLayout` legado para não perder trabalho existente.
- Adicione em `clients.notes` apenas preferências pequenas, como
  `topologyViewMode` e grupos recolhidos, se realmente necessário.
- O layout automático deve ser regenerado dos cadastros a cada carregamento.
- “Salvar topologia” não deve ser obrigatório para a visão automática refletir
  uma câmera, porta ou equipamento recém-cadastrado.
- “Voltar ao automático” deve ignorar posições manuais sem apagá-las
  imediatamente; só remova as posições se o usuário confirmar.

**Verifique**:
`npm run build` → exit 0 e o JSON existente de `clients.notes` continua sendo
mesclado, não substituído.

### Etapa 6: validar cenários reais de CFTV

Faça validação manual no navegador com pelo menos:

1. Internet → Mikrotik → 2 switches → câmeras IP/PoE.
2. Internet → roteador → switch → DVR → 16 câmeras analógicas.
3. DVR → power balun → câmeras e nobreak associado ao rack.
4. Dois roteadores e equipamentos sem vínculo.
5. Mais de 40 câmeras: modo Apresentação legível sem cruzamento massivo; modo
   Técnico navegável por zoom/rolagem.
6. Arraste no modo Técnico: linhas acompanham continuamente o card.
7. Recarregar a página: a visão automática permanece correta e as preferências
   persistidas não corrompem notas, planta baixa ou racks.

Capture uma imagem antes/depois com o mesmo cliente da imagem do relato para
revisão visual.

**Verifique**:
`npm run build` → exit 0; console do navegador sem erros; os sete cenários
conferidos.

## Plano de testes

- Como o repositório não possui runner de testes, mantenha toda lógica de layout
  em funções puras para permitir testes futuros.
- Se houver runner disponível durante a execução, cubra:
  - ordenação numérica de `P2` antes de `P10` e `CH2` antes de `CH10`;
  - subárvores de pais diferentes sem sobreposição;
  - múltiplas raízes;
  - nó órfão;
  - ciclo inválido sem recursão infinita;
  - layout estável para a mesma entrada;
  - agrupamento de 40+ câmeras.
- O gate obrigatório atual é lint focado + build + validação visual dos cenários.

## Critérios de conclusão

- [ ] A abertura da tela produz um diagrama organizado sem arraste manual.
- [ ] Câmeras ficam agrupadas sob seu switch, DVR ou power balun real.
- [ ] Equipamentos sem vínculo aparecem como pendência; nenhuma relação é
  inventada para tornar o desenho bonito.
- [ ] Linhas usam âncoras laterais/verticais, acompanham os blocos e não cruzam
  cards no layout automático.
- [ ] O modo Apresentação continua legível com mais de 40 câmeras.
- [ ] O modo Técnico expõe porta, canal, IP, localização e estado.
- [ ] Nobreak/energia não é confundido com o caminho de vídeo ou rede.
- [ ] `npx eslint ...` e `npm run build` saem com código 0.
- [ ] Nenhum arquivo fora do escopo entra no commit.
- [ ] O status em `advisor-plans/README.md` é atualizado.

## Condições de parada

Pare e relate se:

- O esquema atual não possui dados suficientes para distinguir relações que o
  plano assume como explícitas.
- Implementar o vínculo correto exige mudar formulários ou banco de dados.
- A nova organização exige alterar arquivos fora do escopo.
- Um gate falhar duas vezes após uma tentativa razoável de correção.
- O comportamento real de `clients.notes` divergir dos trechos verificados.

## Notas de manutenção

- Novos tipos de equipamento devem declarar faixa, tamanho visual e meios
  físicos aceitos em `topologyLayout.ts`.
- Revise especialmente a semântica de conexões inferidas: apresentação não pode
  sugerir ao cliente um cabeamento que não foi cadastrado.
- Uma futura exportação PDF deve consumir o mesmo modelo hierárquico e as mesmas
  rotas, evitando um segundo algoritmo visual.
