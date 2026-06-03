# Relatório de Desenvolvimento Técnico - Recursos Avançados de CFTV

Este documento registra as decisões de engenharia, arquitetura e implementação para os 5 novos recursos de gestão de CFTV desenvolvidos na aplicação.

---

## 1. Central de Backups de Configuração
- **Decisão de Design**: Para permitir o armazenamento seguro de arquivos de backup (como configurações de roteadores MikroTik, switches Edge e DVRs Intelbras), criamos o bucket público `device-backups` no Supabase Storage e a tabela `device_backups` com metadados detalhados.
- **Implementação**:
  - Serviço [`src/services/backupService.ts`](file:///c:/DEV/dev_01_active/.proj.cftv/src/services/backupService.ts): centraliza o upload com prevenção de caracteres especiais, listagem ordenada por data e remoção segura (banco + storage).
  - Componente [`src/components/ui/BackupManager.tsx`](file:///c:/DEV/dev_01_active/.proj.cftv/src/components/ui/BackupManager.tsx): fornece uma interface visual com upload drag-and-drop, indicador de tamanho de arquivo, listagem de downloads e exclusão lógica/física.
  - Integrado diretamente nas modais de edição de Roteadores, Switches e DVRs.

---

## 2. Diagnóstico de Ping Coletivo
- **Problema de Rede**: O navegador do usuário opera em uma sandbox que impede conexões ICMP diretas (ping nativo). Conexões HTTP via sockets sofrem com restrições severas de CORS.
- **Solução Contornada**:
  - Componente [`src/components/ui/PingStatusCard.tsx`](file:///c:/DEV/dev_01_active/.proj.cftv/src/components/ui/PingStatusCard.tsx): realiza requisições HTTP paralelas via `fetch` assíncrono com a propriedade `mode: 'no-cors'` e um timeout controlado de 2.5 segundos.
  - **Lógica de Status**:
    - Se o dispositivo responder (mesmo que com erro de CORS do browser, o que é disparado de imediato pelo protocolo TCP do IP local ativo), consideramos **Online/Ativo** (verde).
    - Se a requisição atingir o timeout de 2.5 segundos sem nenhuma resposta da porta TCP, consideramos **Offline/Inativo** (vermelho).
  - Exibido dinamicamente no topo do Dashboard sempre que o cliente selecionado tiver dispositivos com endereço IP.

---

## 3. Planta Baixa Interativa Multi-Opção
- **Persistência Sem Modificação DDL**: Para evitar a adição de colunas extras no Supabase (como `x_pos` e `y_pos` para roteadores, switches, etc.), persistimos a planta baixa inteira serializando em JSON na coluna `notes` da tabela `clients`. Isto preserva as notas em formato de texto pré-existentes.
- **Fundos Alternáveis**:
  - **Grid Técnico**: Fundo escuro estilizado via CSS com padrão de linhas neon azuladas (`#0b111e` + linear-gradient).
  - **Imagem Customizada**: Upload de plantas (JPG, PNG) para o bucket de fotos do Supabase.
  - **Satélite**: Link customizado de imagem aérea da edificação.
- **Interação**:
  - Painel com equipamentos "Não Posicionados".
  - Drag-and-drop avançado usando `motion/react` (Framer Motion) com recomputação de percentual X/Y baseado no tamanho do canvas.
  - **Preview CCTV Retrô**: Passar o mouse ou clicar em uma câmera exibe um popover simulando um monitor de segurança real (relógio em tempo real, scanlines em gradiente digital, legenda de câmera).

---

## 4. Diagrama de Topologia de Rede Automático
- **Mapeamento Lógico**:
  - O componente [`src/components/NetworkTopology.tsx`](file:///c:/DEV/dev_01_active/.proj.cftv/src/components/NetworkTopology.tsx) constrói a árvore física de conexões baseado nas chaves estrangeiras do banco (uma câmera que tem `switch_id` ou `dvr_id`).
  - O layout divide os equipamentos em 5 camadas fixas horizontais (Internet -> Roteadores -> Switches -> Gravadores/Baluns -> Câmeras).
- **Aparência de Engenharia**:
  - Linhas desenhadas dinamicamente através de SVG com caminhos Bézier (`path` com curva cúbica `C`).
  - Cabos de dispositivos ativos recebem animação de fluxo de rede usando o atributo SVG `stroke-dasharray` correndo continuamente em loop CSS.
  - Blocos são totalmente arrastáveis e as posições novas são persistidas na chave `topologyLayout` dentro do campo `notes` do cliente.

---

## 5. Relatório Técnico Consolidado em PDF Premium
- **Suporte a Imagens e CORS**:
  - O gerador [`src/lib/reportGenerator.ts`](file:///c:/DEV/dev_01_active/.proj.cftv/src/lib/reportGenerator.ts) foi reestruturado para ser totalmente assíncrono.
  - O script faz o download das imagens (foto do local de instalação e QR Code de acesso) e converte-as para Base64 usando elementos Canvas dinâmicos antes de construir o PDF.
- **Ficha Técnica Individualizada**:
  - Cada câmera é desenhada em formato de card técnico com cabeçalho de status colorido (online/offline).
  - Inclui dados de rede, especificações do cabeamento UTP crimpado e a foto do local + QR Code lado a lado no próprio corpo do documento.
  - Tabela extra com credenciais de rede mascaradas para auditoria técnica.
