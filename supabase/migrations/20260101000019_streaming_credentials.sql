-- ============================================
-- Migration: Credenciais de streaming para câmeras
-- Adiciona campos de usuário e senha para autenticação HTTP Basic no DVR
-- ============================================

-- Adiciona coluna para usuário de autenticação do streaming
alter table cameras add column if not exists streaming_user varchar(100);

-- Adiciona coluna para senha de autenticação do streaming
alter table cameras add column if not exists streaming_password varchar(200);
