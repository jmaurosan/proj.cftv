SOPS + age — gerenciamento de segredos seguro e gratuito para este repositório

Visão geral

Este projeto usa uma abordagem leve, gratuita e segura para gerenciar segredos sem depender de um gestor pago: SOPS (Mozilla) + age (criptografia moderna). O repositório armazena um arquivo criptografado (secrets.enc.yaml) que pode ser comitado com segurança. Somente máquinas que possuírem a chave privada age correspondente poderão descriptografá-lo.

O que isso fornece
- Segredos criptografados armazenados no repositório (seguros para comitar)
- Descriptografia simples em CI / servidores usando a chave privada via canal seguro
- Sem custo com fornecedor; funciona offline e em CI (ex.: GitHub Actions)

Arquivos adicionados
- tools/sops-decrypt.sh — helper POSIX para descriptografar (lê variável de ambiente SOPS_AGE_KEY ou SOPS_AGE_KEY_FILE)
- tools/sops-decrypt.ps1 — helper PowerShell para descriptografar no Windows
- secrets.example.yaml — modelo em texto (NÃO COMITAR segredos reais)

Instalação (desenvolvimento local):
1. Instale age e sops
   - macOS: brew install age sops
   - Linux: siga as instruções nas páginas do projeto: https://github.com/FiloSottile/age e https://github.com/ProtonMail/sops
   - Windows: use scoop/choco ou baixe os binários; o script PowerShell pode ser usado para descriptografar

2. Gere um par de chaves age (mantenha a chave privada segura)

   # gerar a chave privada (exemplo de caminho)
   age-keygen -o ~/.config/sops/age/key.txt

   # obter a chave pública para compartilhar com quem irá encriptar
   cat ~/.config/sops/age/key.txt.pub

3. Crie seu arquivo de segredos em texto (localmente, NÃO COMITAR)
   - copie secrets.example.yaml para secrets.yaml e preencha os valores

4. Encripte o arquivo usando a(s) chave(s) pública(s) age dos colaboradores
   # exemplo: substitua AGE_PUB_KEY pela string da chave pública (key.txt.pub)
   sops --encrypt --age "AGE_PUB_KEY" secrets.yaml > secrets.enc.yaml

   Comite secrets.enc.yaml (arquivo encriptado) no repositório. NÃO comite secrets.yaml nem sua chave privada.

Descriptografando localmente (desenvolvedor)
- Método A: se você tem a chave privada age em ~/.config/sops/age/key.txt e sops instalado
  sops --decrypt secrets.enc.yaml > secrets.yaml

- Método B: usando o script helper com o conteúdo da chave privada em uma variável de ambiente (seguro para CI)
  # Bash (Linux/macOS)
  export SOPS_AGE_KEY="$(cat ~/.config/sops/age/key.txt)"
  bash tools/sops-decrypt.sh

  # PowerShell (Windows)
  $env:SOPS_AGE_KEY = Get-Content -Raw $HOME\.config\sops\age\key.txt
  pwsh -File tools\sops-decrypt.ps1

Usando os segredos na aplicação
- Opção A: O servidor descriptografa secrets.yaml na inicialização e exporta as chaves necessárias como variáveis de ambiente (recomendado em servidores).
  Exemplo (systemd):
    ExecStartPre=/usr/bin/sops --decrypt /path/to/repo/secrets.enc.yaml > /run/cftv/secrets.yaml
    ExecStart=/usr/bin/env $(cat /run/cftv/secrets.yaml | xargs) node server.mjs

- Opção B: O servidor lê e faz parse de secrets.yaml no código de inicialização (Node.js), por exemplo:
  const fs = require('fs')
  const yaml = require('js-yaml')
  const secrets = yaml.load(fs.readFileSync('secrets.yaml', 'utf8'))
  // use secrets.GEMINI_KEY, secrets.MEDIAMTX_TOKEN, etc.

CI (GitHub Actions) — exemplo de workflow

# armazene a chave privada age como um segredo do repositório (SOPS_AGE_KEY)
# no workflow, crie um arquivo temporário com a chave e descriptografe

```yaml
name: CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install sops and age
        run: |
          sudo apt-get update && sudo apt-get install -y wget unzip
          curl -L -o sops.tar.gz https://github.com/ProtonMail/sops/releases/download/v3.8.0/sops_3.8.0_linux_amd64.tar.gz
          tar -xzf sops.tar.gz sops
          sudo mv sops /usr/local/bin/
          # install age
          curl -L -o age.tar.gz https://github.com/FiloSottile/age/releases/download/v1.0.0/age-v1.0.0-linux-amd64.tar.gz
          tar -xzf age.tar.gz age
          sudo mv age /usr/local/bin/
      - name: Decrypt secrets
        env:
          SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY }}
        run: |
          echo "$SOPS_AGE_KEY" > sops-age-key.txt
          sops --decrypt --age-file sops-age-key.txt secrets.enc.yaml > secrets.yaml
      - name: Run build/test
        run: npm ci && npm test
```

Notas de segurança e melhores práticas
- NÃO comite chaves privadas nem o arquivo secrets.yaml. Comite apenas o arquivo encriptado secrets.enc.yaml.
- Proteja e faça backup da sua chave privada age. Se uma chave for comprometida, rotacione os segredos e re-encripte com novas chaves.
- Use os segredos do CI para armazenar a chave privada com segurança (GitHub Actions Secrets ou secrets da org).
- Em produção, prefira colocar a chave privada em um arquivo seguro no servidor (ex.: /etc/sops/age/key.txt com chmod 600) em vez de colocá-la em variáveis de ambiente quando possível.
- Para equipes, adicione múltiplos recipientes --age ao encriptar para que cada pessoa tenha sua própria chave pública de acesso.

Como isso se encaixa no seu projeto
- Mova as chaves que hoje estão no build do frontend (VITE_*) para secrets.enc.yaml e permita que o servidor/proxy as leia.
- Exemplos de segredos: GEMINI_KEY, MEDIAMTX_TOKEN, CREDENTIAL_ENCRYPTION_KEY
- Posso ajudar a modificar tools/gemini-proxy/server.mjs e tools/mediamtx-agent/server.mjs para carregarem secrets.yaml se desejar.

Se quiser, posso:
- Criar um exemplo de secrets.enc.yaml (encriptado com uma chave pública de placeholder) e os scripts de descriptografia (já adicionados), ou
- Modificar tools/gemini-proxy/server.mjs e tools/mediamtx-agent/server.mjs para carregar secrets.yaml na inicialização (somente quando você confirmar que irá prover a chave privada no servidor).

