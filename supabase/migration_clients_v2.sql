-- ============================================
-- Migration v2: Campos adicionais para clientes
-- CNPJ, CPF, CEP, número, complemento, bairro
-- ============================================

alter table clients add column if not exists person_type varchar(2) default 'PJ'; -- PJ ou PF
alter table clients add column if not exists cnpj varchar(18);        -- 00.000.000/0000-00
alter table clients add column if not exists cpf varchar(14);         -- 000.000.000-00
alter table clients add column if not exists zipcode varchar(9);      -- 00000-000
alter table clients add column if not exists street varchar(200);     -- logradouro
alter table clients add column if not exists number varchar(10);      -- número
alter table clients add column if not exists complement varchar(100); -- complemento
alter table clients add column if not exists neighborhood varchar(100); -- bairro
alter table clients add column if not exists website varchar(200);    -- site
