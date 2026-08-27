Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$settingsPath = Join-Path $scriptDir "agent-settings.json"
$nodePath = Join-Path $scriptDir "runtime\node.exe"
$serverPath = Join-Path $scriptDir "app\server.mjs"
$logDir = Join-Path $scriptDir "logs"
$logPath = Join-Path $logDir "agent.log"

try {
    if (-not (Test-Path -LiteralPath $settingsPath)) {
        throw "Arquivo agent-settings.json nao encontrado."
    }
    if (-not (Test-Path -LiteralPath $nodePath)) {
        throw "Runtime do agente nao encontrado."
    }

    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
    $env:CFTV_MEDIAMTX_AGENT_TOKEN = [string]$settings.token
    $env:CFTV_MEDIAMTX_AGENT_HOST = "127.0.0.1"
    $env:CFTV_MEDIAMTX_AGENT_PORT = [string]$settings.port
    $env:CFTV_MEDIAMTX_CONFIG_PATH = [string]$settings.configPath
    $env:CFTV_MEDIAMTX_ALLOWED_ORIGINS = [string]$settings.allowedOrigins

    & $nodePath $serverPath *>> $logPath
    exit $LASTEXITCODE
}
catch {
    $message = $_.Exception.Message
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Add-Content -LiteralPath $logPath -Value "[ERROR] $message"
    exit 1
}
