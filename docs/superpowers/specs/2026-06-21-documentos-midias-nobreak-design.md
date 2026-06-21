# Documentos, Midias e Especificacoes de Nobreak

## Objetivo

Separar a gestao de nobreaks da biblioteca geral do projeto e permitir que manuais, fichas tecnicas, fotos e videos sejam associados a qualquer equipamento ou ao projeto como um todo.

O formulario do nobreak deve registrar apenas as informacoes tecnicas relevantes para projeto e manutencao, usando como referencia o datasheet oficial do Intelbras XNB 1800 VA BI+.

Fonte: [Datasheet Intelbras XNB 1800 VA BI+](https://backend.intelbras.com/sites/default/files/2024-08/XNB%201800%20VA%20BI%2B%20-%20Datasheet%20-%20conector%20SB%2050.pdf)

## Estrutura de Navegacao

- Renomear a pagina atual para **Nobreaks** e manter nela somente cadastro, edicao, exclusao e resumo de protecao eletrica.
- Criar a pagina independente **Documentos e Midias** no menu lateral.
- Organizar a nova pagina nas abas **Documentos tecnicos**, **Fotos e videos** e **Visao por equipamento**.
- Manter o seletor global de cliente como limite de todos os dados exibidos.
- Em telas pequenas, empilhar cabecalho, filtros, cards e acoes sem rolagem horizontal.

## Documentos Tecnicos

Reaproveitar o modelo generico ja iniciado no projeto. Cada documento tera:

- titulo;
- categoria: manual, ficha tecnica, garantia, certificado, diagrama ou outro;
- equipamento vinculado ou `Projeto geral`;
- arquivo local e/ou link oficial do fabricante;
- nome, tamanho e data de inclusao.

Tipos de equipamento disponiveis: camera, DVR, switch, roteador, balun, nobreak e projeto geral. A lista sera carregada para o cliente selecionado e podera ser filtrada por tipo, equipamento, categoria e texto.

## Fotos e Videos

Adicionar uma colecao separada de midias para evitar misturar registros visuais com documentos tecnicos. Cada item tera:

- titulo e descricao opcional;
- tipo `image` ou `video`;
- equipamento vinculado ou `Projeto geral`;
- nome, caminho, tamanho, tipo MIME e data de inclusao;
- data do registro, quando informada pelo usuario.

Formatos iniciais: JPG, JPEG, PNG e WEBP para imagens; MP4 e WEBM para videos. Imagens terao limite de 20 MB e videos de 100 MB, sujeito tambem ao limite configurado no bucket do Supabase.

A interface exibira imagens em grade e videos com player nativo. A primeira versao nao fara edicao, compressao nem geracao de miniaturas no cliente.

## Especificacoes Essenciais do Nobreak

O formulario deve priorizar:

- marca e modelo;
- localizacao e status;
- potencia aparente em VA;
- potencia ativa em W;
- topologia;
- tensao de entrada e modo bivolt;
- tensao de saida;
- quantidade de tomadas;
- configuracao do banco de baterias;
- autonomia estimada, quando conhecida;
- protecoes eletricas;
- conector ou observacao de bateria externa;
- link oficial e observacoes.

Para o XNB 1800 VA BI+, os valores confirmados no datasheet sao: 1800 VA, 900 W, topologia interativa, entrada bivolt automatica 120/220 V, saida 120 V, seis tomadas, banco externo de 24 V com duas baterias de 12 V em serie, conector SB 50, religamento automatico e seis niveis de protecao.

O campo atual `inputPowerWatts` nao representa uma especificacao principal do fabricante. O modelo passara a usar `ratedPowerWatts`. Ao ler registros antigos, o sistema usara `outputPowerWatts` como valor de compatibilidade quando o novo campo ainda nao existir.

## Modelo e Persistencia

`ProjectAssets` sera ampliado sem apagar registros existentes:

```ts
interface ProjectAssets {
  nobreaks: Nobreak[]
  documents: EquipmentDocument[]
  media: ProjectMedia[]
}
```

O parser deve assumir listas vazias quando `documents` ou `media` nao existirem. Os metadados permanecerao em `clients.notes.projectAssets`, seguindo o padrao atual. Os arquivos continuarao no Supabase Storage, com caminhos distintos:

- `documents/{clientId}/{equipmentType}/{equipmentId}/...`
- `media/{clientId}/{equipmentType}/{equipmentId}/...`

Excluir um equipamento com documentos ou midias vinculados deve ser bloqueado ate que os vinculos sejam removidos ou transferidos.

## Fluxos

### Adicionar documento

1. Selecionar categoria e equipamento, ou projeto geral.
2. Informar titulo.
3. Anexar arquivo, informar link oficial ou ambos.
4. Validar formato e tamanho.
5. Fazer upload e persistir os metadados.
6. Remover o upload se a persistencia dos metadados falhar.

### Adicionar foto ou video

1. Selecionar equipamento ou projeto geral.
2. Selecionar o arquivo e informar titulo.
3. Validar tipo MIME, extensao e tamanho.
4. Fazer upload e persistir os metadados.
5. Exibir o novo item na galeria.

## Tratamento de Erros

- Exibir mensagens em portugues para arquivo invalido, excesso de tamanho, falha de upload, falha de persistencia e cliente nao selecionado.
- Evitar metadados sem arquivo: se a gravacao falhar, excluir o arquivo enviado.
- Evitar arquivos orfaos: ao excluir um item, persistir a remocao e depois remover o objeto do Storage.
- Preservar os dados antigos quando o JSON de `notes` contiver outras chaves.

## Testes

- Parser de dados antigos sem `media` e sem `ratedPowerWatts`.
- Compatibilidade do valor em watts de nobreaks antigos.
- Validacao dos campos essenciais do nobreak.
- Validacao de extensao, MIME e tamanho de documentos, imagens e videos.
- Inclusao e remocao de metadados sem alterar outras colecoes.
- Bloqueio de exclusao de equipamento com vinculos.
- Renderizacao responsiva da pagina em larguras desktop e mobile.
- Build e lint completos do projeto.

## Fora do Escopo

- Edicao de imagens ou videos.
- Transcodificacao, compressao e miniaturas geradas no navegador.
- OCR ou leitura automatica de datasheets.
- Compartilhamento publico independente do controle atual do projeto.
