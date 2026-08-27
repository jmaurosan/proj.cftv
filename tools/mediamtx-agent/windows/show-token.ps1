Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$settingsPath = Join-Path $scriptDir "agent-settings.json"

try {
    $settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
    $token = [string]$settings.token
    Set-Clipboard -Value $token
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "O token do agente foi copiado para a area de transferencia. Cole no CFTV.PROJ e nao compartilhe com terceiros.",
        "CFTV.PROJ - Token do agente",
        "OK",
        "Information"
    ) | Out-Null
    exit 0
}
catch {
    Write-Warning "Nao foi possivel obter o token: $_"
    exit 1
}
