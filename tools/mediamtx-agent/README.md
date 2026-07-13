# CFTV MediaMTX Agent

Agente local para receber o YAML gerado pelo CFTV.PROJ e atualizar o arquivo `mediamtx.yml` no Windows.

## Iniciar

```powershell
npm run mediamtx:agent
```

Por padrao ele escuta em:

```txt
http://127.0.0.1:8727
```

E atualiza:

```txt
C:\MediaMTX\mediamtx.yml
```

## Token

Token padrao da primeira versao:

```txt
cftv-local-agent
```

Para trocar:

```powershell
$env:CFTV_MEDIAMTX_AGENT_TOKEN="sua-chave-local"
npm run mediamtx:agent
```

## Caminho do MediaMTX

Para apontar para outro arquivo:

```powershell
$env:CFTV_MEDIAMTX_CONFIG_PATH="C:\MediaMTX\mediamtx.yml"
npm run mediamtx:agent
```

## Segurança

- O agente fica preso em `127.0.0.1` por padrao.
- Toda gravacao cria backup antes de substituir o YAML.
- A rota de escrita exige o header `x-cftv-agent-token`.
- Esta primeira versao nao reinicia o MediaMTX automaticamente.
