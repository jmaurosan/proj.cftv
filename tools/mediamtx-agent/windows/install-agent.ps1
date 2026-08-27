Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$installRoot = Join-Path $env:LOCALAPPDATA "CFTV.PROJ\Agent"
$taskName = "CFTV.PROJ Local Agent"
$settingsPath = Join-Path $installRoot "agent-settings.json"
$existingToken = $null

function New-AgentToken {
    $bytes = New-Object byte[] 32
    $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $random.GetBytes($bytes)
    }
    finally {
        $random.Dispose()
    }
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function New-AgentShortcut {
    param(
        [Parameter(Mandatory = $true)][string]$ShortcutPath,
        [Parameter(Mandatory = $true)][string]$ScriptPath
    )
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($ShortcutPath)
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""
    $shortcut.WorkingDirectory = $installRoot
    $shortcut.Save()
}

try {
    if (Test-Path -LiteralPath $settingsPath) {
        $existingSettings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
        $existingToken = [string]$existingSettings.token
    }

    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }

    New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
    $installedRuntime = Join-Path $installRoot "runtime"
    $installedApp = Join-Path $installRoot "app"
    if (Test-Path -LiteralPath $installedRuntime) {
        Remove-Item -LiteralPath $installedRuntime -Recurse -Force
    }
    if (Test-Path -LiteralPath $installedApp) {
        Remove-Item -LiteralPath $installedApp -Recurse -Force
    }
    Copy-Item -LiteralPath (Join-Path $packageRoot "runtime") -Destination $installRoot -Recurse -Force
    Copy-Item -LiteralPath (Join-Path $packageRoot "app") -Destination $installRoot -Recurse -Force
    Copy-Item -LiteralPath (Join-Path $packageRoot "launch-agent.ps1") -Destination $installRoot -Force
    Copy-Item -LiteralPath (Join-Path $packageRoot "show-token.ps1") -Destination $installRoot -Force
    Copy-Item -LiteralPath (Join-Path $packageRoot "check-agent.ps1") -Destination $installRoot -Force
    Copy-Item -LiteralPath (Join-Path $packageRoot "uninstall-agent.ps1") -Destination $installRoot -Force

    $token = if ($existingToken) { $existingToken } else { New-AgentToken }
    $settings = [ordered]@{
        token = $token
        port = 8727
        configPath = "C:\MediaMTX\mediamtx.yml"
        allowedOrigins = "http://localhost:5173,http://127.0.0.1:5173,https://proj-cftv.vercel.app"
    }
    $settings | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $settingsPath -Encoding UTF8

    $currentIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $userSid = $currentIdentity.User
    $acl = New-Object System.Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true, $false)
    $inheritance = [System.Security.AccessControl.InheritanceFlags]"ContainerInherit, ObjectInherit"
    $propagation = [System.Security.AccessControl.PropagationFlags]::None
    $userRule = New-Object System.Security.AccessControl.FileSystemAccessRule($userSid, "FullControl", $inheritance, $propagation, "Allow")
    $systemSid = New-Object System.Security.Principal.SecurityIdentifier("S-1-5-18")
    $systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule($systemSid, "FullControl", $inheritance, $propagation, "Allow")
    $acl.AddAccessRule($userRule)
    $acl.AddAccessRule($systemRule)
    Set-Acl -LiteralPath $installRoot -AclObject $acl

    $launcherPath = Join-Path $installRoot "launch-agent.ps1"
    $actionArgs = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$launcherPath`""
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $actionArgs
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentIdentity.Name
    $principal = New-ScheduledTaskPrincipal -UserId $currentIdentity.Name -LogonType Interactive -RunLevel Limited
    $settingsSet = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settingsSet -Description "Agente local do CFTV.PROJ" -Force | Out-Null

    $startMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\CFTV.PROJ"
    New-Item -ItemType Directory -Path $startMenuDir -Force | Out-Null
    New-AgentShortcut -ShortcutPath (Join-Path $startMenuDir "Mostrar token do agente.lnk") -ScriptPath (Join-Path $installRoot "show-token.ps1")
    New-AgentShortcut -ShortcutPath (Join-Path $startMenuDir "Verificar agente.lnk") -ScriptPath (Join-Path $installRoot "check-agent.ps1")
    New-AgentShortcut -ShortcutPath (Join-Path $startMenuDir "Desinstalar agente.lnk") -ScriptPath (Join-Path $installRoot "uninstall-agent.ps1")

    Start-ScheduledTask -TaskName $taskName
    Start-Sleep -Seconds 2
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8727/health" -TimeoutSec 5
    if (-not $health.ok) {
        throw "O agente foi instalado, mas nao respondeu ao teste de saude."
    }

    Set-Clipboard -Value $token
    Write-Output "[OK] CFTV.PROJ Local Agent instalado e iniciado."
    Write-Output "[OK] O agente iniciara automaticamente no logon."
    Write-Output "[OK] Token copiado para a area de transferencia."
    Write-Output "[INFO] URL do agente: http://127.0.0.1:8727"
    Write-Output "[INFO] Versao: $($health.version)"
    Read-Host "Pressione ENTER para fechar"
    exit 0
}
catch {
    Write-Warning "Falha na instalacao: $_"
    Read-Host "Pressione ENTER para fechar"
    exit 1
}
