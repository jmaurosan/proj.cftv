Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8727/health" -TimeoutSec 5
    $version = [string]$health.version
    $hostname = [string]$health.hostname
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "Agente online.`nComputador: $hostname`nVersao: $version",
        "CFTV.PROJ - Status do agente",
        "OK",
        "Information"
    ) | Out-Null
    exit 0
}
catch {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(
        "O agente nao respondeu. Reinicie o computador ou execute o instalador novamente.",
        "CFTV.PROJ - Agente indisponivel",
        "OK",
        "Warning"
    ) | Out-Null
    exit 1
}
