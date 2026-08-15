param()
<#
Script auxiliar PowerShell para descriptografar secrets.enc.yaml usando SOPS + age
Uso (local): $env:SOPS_AGE_KEY = Get-Content -Raw $HOME\\.config\\sops\\age\\key.txt; pwsh tools\sops-decrypt.ps1
No CI: armazene a chave privada como um segredo (SOPS_AGE_KEY) e execute este script
#>

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$encFile = Join-Path $repoRoot "secrets.enc.yaml"
$outFile = Join-Path $repoRoot "secrets.yaml"

if (-not (Test-Path $encFile)) {
    Write-Error "Encrypted secrets file not found at $encFile"
    exit 1
}

if (-not $env:SOPS_AGE_KEY -and -not $env:SOPS_AGE_KEY_FILE) {
    Write-Error "Provide SOPS_AGE_KEY (contents) or SOPS_AGE_KEY_FILE (path to private key) as env var"
    exit 2
}

$tmpKeyPath = $null
if ($env:SOPS_AGE_KEY_FILE) {
    $tmpKeyPath = $env:SOPS_AGE_KEY_FILE
} else {
    $tmpKeyPath = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $tmpKeyPath -Value $env:SOPS_AGE_KEY -Force -NoNewline
}

# Call sops to decrypt (assumes sops is installed and in PATH)
$sopsCmd = "sops --decrypt --age-file `"$tmpKeyPath`" `"$encFile`" > `"$outFile`""

# Use cmd /c to allow redirection on Windows
cmd.exe /c $sopsCmd
Write-Output "Decrypted to $outFile"

# cleanup
if (-not $env:SOPS_AGE_KEY_FILE) {
    Remove-Item $tmpKeyPath -Force
}

exit 0
