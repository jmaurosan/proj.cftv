param(
    [string]$NodePath = "",
    [string]$OutputDirectory = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$agentDir = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent (Split-Path -Parent $agentDir)
$outputRoot = if ($OutputDirectory) { $OutputDirectory } else { Join-Path $repoRoot "output\agent-installer" }
$packageDir = Join-Path $outputRoot "CFTV-PROJ-Agente-Windows"
$zipPath = Join-Path $outputRoot "CFTV-PROJ-Agente-Windows.zip"

try {
    if (-not $NodePath) {
        $nodeCommand = Get-Command node.exe -ErrorAction Stop
        $NodePath = $nodeCommand.Source
    }
    if (-not (Test-Path -LiteralPath $NodePath)) {
        throw "node.exe nao encontrado em $NodePath"
    }

    if (Test-Path -LiteralPath $packageDir) {
        Remove-Item -LiteralPath $packageDir -Recurse -Force
    }
    if (Test-Path -LiteralPath $zipPath) {
        Remove-Item -LiteralPath $zipPath -Force
    }

    New-Item -ItemType Directory -Path (Join-Path $packageDir "runtime") -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $packageDir "app") -Force | Out-Null
    Copy-Item -LiteralPath $NodePath -Destination (Join-Path $packageDir "runtime\node.exe") -Force
    Copy-Item -LiteralPath (Join-Path $agentDir "server.mjs") -Destination (Join-Path $packageDir "app\server.mjs") -Force
    Copy-Item -LiteralPath (Join-Path $agentDir "agentCore.mjs") -Destination (Join-Path $packageDir "app\agentCore.mjs") -Force

    @("install-agent.ps1", "launch-agent.ps1", "show-token.ps1", "check-agent.ps1", "uninstall-agent.ps1", "Instalar-Agente-CFTV.cmd") | ForEach-Object {
        Copy-Item -LiteralPath (Join-Path $scriptDir $_) -Destination $packageDir -Force
    }

    Compress-Archive -LiteralPath $packageDir -DestinationPath $zipPath -CompressionLevel Optimal
    Remove-Item -LiteralPath $packageDir -Recurse -Force
    Write-Output "[OK] Instalador gerado: $zipPath"
    exit 0
}
catch {
    Write-Warning "Falha ao gerar o instalador: $_"
    exit 1
}
