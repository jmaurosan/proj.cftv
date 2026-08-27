# Planos de implementação

Gerados pelo skill `improve` em 2026-07-27. Execute na ordem abaixo. Antes de
iniciar, leia o plano inteiro, respeite as condições de parada e atualize o
status ao concluir.

## Ordem de execução e status

| Plano | Título | Prioridade | Esforço | Depende de | Status |
|------|--------|------------|---------|------------|--------|
| 001 | Transformar a topologia física em diagrama automático apresentável | P1 | L | — | DONE |

Status possíveis: TODO | IN PROGRESS | DONE | BLOCKED | REJECTED.

## Achados considerados e rejeitados

- Manter o canvas livre como experiência principal: rejeitado porque conserva
  justamente a necessidade de arrastar e alinhar manualmente que causa o
  problema relatado.
- Adicionar uma biblioteca de grafos nesta primeira entrega: rejeitado porque o
  projeto já possui nós e conexões estruturados; um layout hierárquico
  determinístico e rotas ortogonais podem ser implementados localmente, sem
  aumentar o bundle nem introduzir outra API de interação.
- Migrar a persistência para novas tabelas: adiado porque não é necessário para
  resolver apresentação, organização ou atualização automática.
