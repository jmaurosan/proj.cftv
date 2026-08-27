Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$taskName = "CFTV.PROJ Local Agent"
$installRoot = Join-Path $env:LOCALAPPDATA "CFTV.PROJ\Agent"

try {
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($task) {
        Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }

    $startMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\CFTV.PROJ"
    if (Test-Path -LiteralPath $startMenuDir) {
        Remove-Item -LiteralPath $startMenuDir -Recurse -Force
    }

    Write-Output "[OK] Agente removido da inicializacao automatica."
    $expectedRoot = Join-Path $env:LOCALAPPDATA "CFTV.PROJ\Agent"
    if ([string]::Equals($installRoot, $expectedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        $escapedRoot = $installRoot.Replace("'", "''")
        $cleanupCommand = "Start-Sleep -Seconds 2; Remove-Item -LiteralPath '$escapedRoot' -Recurse -Force -ErrorAction SilentlyContinue"
        Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-WindowStyle", "Hidden", "-Command", $cleanupCommand -WindowStyle Hidden
    }
    Write-Output "[OK] Arquivos locais agendados para remocao."
    exit 0
}
catch {
    Write-Warning "Falha ao desinstalar o agente: $_"
    exit 1
}
