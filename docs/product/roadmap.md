# Evolucao do CFTV.PROJ para micro SaaS

## Objetivo
Fortalecer a base multiempresa e entregar, em etapas seguras, diagnostico de instalacoes, comissionamento, calculos tecnicos e manutencao, incluindo uma demonstracao isolada com dados ficticios.

## Etapas
- [ ] Consolidar migrations, matriz owner/operator/viewer e verificacao da versao do banco. Verificar com testes RLS por perfil.
- [ ] Proteger credenciais e o agente MediaMTX, removendo consultas e tokens inseguros. Verificar mascaramento, revelacao autorizada e rotacao.
- [ ] Tornar trocas de canais e vinculos fisicos transacionais e criar diagnostico de inconsistencias. Verificar concorrencia e rollback no Supabase de teste.
- [ ] Criar painel central de instalacoes com camera, DVR/canal, switch/porta e Power Balun/porta. Verificar filtros e correcoes sem perda de historico.
- [ ] Criar fluxo de comissionamento individual e historico tecnico por equipamento. Verificar uso responsivo e anexos privados.
- [ ] Criar consumo eletrico por categoria e calculo automatico W = V x A, sem dupla contagem. Verificar cargas PoE e fontes separadas.
- [ ] Criar calculadora de armazenamento/retencao e plano global de enderecos IP. Verificar cenarios analogicos, IP e Wi-Fi.
- [ ] Criar modo demonstracao isolado, somente leitura ou restauravel, com dados ficticios. Verificar que nenhum dado real ou segredo seja acessivel.
- [ ] Preparar base comercial: organizacoes, limites de plano, periodo de teste e pontos de integracao de cobranca. Verificar isolamento entre empresas.
- [ ] Preparar distribuicao hibrida: SaaS gerenciado, licenca self-hosted e edicao white-label. Incluir instalador Docker, banco vazio por migrations, backup, restauracao, atualizador e termos de licenca sem dados ou segredos reais.
- [ ] Finalizar testes, README operacional e validacao local completa antes de qualquer publicacao.

## Concluido quando
- [ ] As operacoes criticas forem atomicas, as permissoes forem aplicadas no banco e a demonstracao estiver totalmente separada dos clientes reais.
- [ ] Testes, lint e build passarem e cada modulo tiver procedimento de verificacao documentado.

## Observacoes
- O desenvolvimento sera validado localmente por padrao; migrations e publicacao em producao exigem uma etapa explicita de aplicacao.
- O modo demonstracao nao armazenara credenciais reais e devera ser reiniciado periodicamente.
