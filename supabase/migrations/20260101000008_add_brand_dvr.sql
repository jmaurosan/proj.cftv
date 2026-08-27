-- Adiciona coluna 'brand' na tabela dvrs
-- Data: 2025-01-20

-- Adiciona coluna brand na tabela dvrs
alter table dvrs add column if not exists brand varchar(100);

-- Comment para documentacao
comment on column dvrs.brand is 'Marca do DVR (ex: Intelbras, Hikvision)';

-- Verifica se a coluna foi adicionada
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'dvrs' and column_name = 'brand'
  ) then
    raise notice 'Coluna brand adicionada com sucesso na tabela dvrs';
  else
    raise notice 'Coluna brand ja existia ou nao pode ser adicionada';
  end if;
end $$;