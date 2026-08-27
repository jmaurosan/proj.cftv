# CFTV MediaMTX Agent

Agente local para receber o YAML gerado pelo CFTV.PROJ, atualizar o arquivo `mediamtx.yml` no Windows e executar diagnósticos reais de rede a partir do PC técnico.

## Instalador para Windows (recomendado)

Distribua o arquivo `CFTV-PROJ-Agente-Windows.zip`. No computador tecnico:

1. Extraia todo o ZIP para uma pasta.
2. Execute `Instalar-Agente-CFTV.cmd`.
3. Ao concluir, o token sera copiado para a area de transferencia.
4. Cole o token na pagina Diagnostico de Rede do CFTV.PROJ.

O pacote inclui um runtime proprio, portanto nao exige Node.js instalado. O agente
fica em `%LOCALAPPDATA%\CFTV.PROJ\Agent`, inicia automaticamente no logon e cria
atalhos no menu Iniciar para verificar o status, mostrar o token e desinstalar.

Executar novamente uma versao mais nova do instalador atualiza o agente e preserva
o token existente.

## Inicializacao manual para desenvolvimento

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

O agente nao possui token padrao. Configure uma chave exclusiva antes de iniciar:

```powershell
$env:CFTV_MEDIAMTX_AGENT_TOKEN="use-uma-chave-aleatoria-longa-e-exclusiva"
npm run mediamtx:agent
```

Sem essa variavel, o agente cria um token temporario e o mostra no terminal.
Ele muda a cada reinicializacao. O navegador guarda o token somente durante a
sessao atual.

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
- O diagnóstico de rede também exige o token e aceita somente endereços IPv4 válidos.
- O ping é executado pelo computador do agente; ele precisa estar na LAN do cliente ou conectado por VPN/WireGuard.
- O token nao fica salvo permanentemente no navegador.
- Esta primeira versao nao reinicia o MediaMTX automaticamente.
