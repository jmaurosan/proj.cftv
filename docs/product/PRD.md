# PRD - Sistema de Gestão de Infraestrutura de CFTV

## 1. Visão Geral
Este documento detalha os requisitos e a arquitetura do sistema de gestão de ativos de CFTV, projetado para centralizar o controle, inventário e monitoramento de câmeras, DVRs, Power Baluns e Switches de rede.

## 2. Objetivos do Projeto
*   **Inventário Centralizado**: Registrar todos os equipamentos com detalhes técnicos (IPs, Marcas, Modelos).
*   **Segurança de Credenciais**: Armazenar de forma segura usuários e senhas de acesso local e em nuvem (HikConnect).
*   **Monitoramento em Tempo Real**: Integração com streaming de baixa latência via WebRTC.
*   **Mapeamento de Infraestrutura**: Visualizar a conexão física entre câmeras, baluns, switches e gravadores.

## 3. Stack Tecnológica
*   **Frontend**: React + Vite + TailwindCSS (ou CSS Customizado).
*   **Animações**: Motion (Framer Motion).
*   **Ícones**: Lucide React.
*   **Backend & Persistência**: Supabase (PostgreSQL + RLS).
*   **Media Server**: go2rtc (para conversão RTSP -> WebRTC).
*   **Hospedagem Recomendada**: Vercel / Netlify.

## 4. Requisitos Funcionais

### 4.1. Gestão de Dispositivos
*   **DVRs**: Cadastro de nome, marca, modelo, IP, canais, firmware e credenciais (Local e HikConnect).
*   **Câmeras**: Cadastro vinculado a um DVR, contendo IP, tipo (IP/Analógica), canal e stream ID.
*   **Infraestrutura**: Gestão de Power Baluns (portas e localização) e Switches de rede (portas POE e IPs de gerência).

### 4.2. Visualização (Live View)
*   Integração com **go2rtc** para exibição de streams via WebRTC em milissegundos.
*   Suporte a visualização individual e em grade (futuro).

### 4.3. Dashboard e Métricas
*   Contagem em tempo real de dispositivos ativos.
*   Logs de eventos e alertas de status (Online/Offline).

## 5. Arquitetura de Dados (Supabase)
O banco de dados utiliza as seguintes tabelas principais:
*   `clients`: Dados do condomínio/cliente.
*   `dvrs`: Central de processamento de imagem.
*   `cameras`: Pontos finais de captura.
*   `power_baluns`: Hubs de conexão analógica.
*   `network_switches`: Ativos de rede.
*   `connections`: Mapeamento lógico entre portas e cabos.

## 6. Requisitos Não Funcionais
*   **Latência**: O vídeo deve carregar em menos de 500ms através do WebRTC.
*   **Segurança**: Credenciais sensíveis protegidas por RLS no Supabase.
*   **Responsividade**: O sistema deve ser totalmente funcional em tablets e desktops para uso em campo.

## 7. Roadmap de Evolução
*   [ ] Implementação de Service Worker para consulta offline de senhas.
*   [ ] Geração automática de diagramas de rede baseados nas conexões cadastradas.
*   [ ] Sistema de alertas via Telegram/WhatsApp para queda de dispositivos.
