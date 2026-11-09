# Windows version of scripts/start-tunnels.sh.
# Opens the Laravel API and (if running) the admin dashboard through Cloudflare quick
# tunnels, then starts the Expo app with Expo's tunnel and the public API URL.
#
# Start the API (and optionally `npm run dev` in admin-web) first, then run from the repo root:
#   powershell -ExecutionPolicy Bypass -File scripts\start-tunnels.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\start-tunnels.ps1 -NoExpo
#
# Quick-tunnel URLs change every run. Anyone with a URL can reach that service,
# so use demo data and strong passwords. Press Ctrl+C to close every tunnel.
param(
    [int]$ApiPort = 8002,
    [int]$DashboardPort = 5173,
    [switch]$NoExpo
)

$ErrorActionPreference = 'Stop'
# Windows PowerShell 5.1 may default to old TLS versions that Cloudflare rejects.
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$RootDir = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path ([System.IO.Path]::GetTempPath()) ("euevent-tunnels-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $LogDir | Out-Null
$TunnelProcesses = @()

# Find cloudflared on PATH, or in its usual install folders (a terminal opened before
# installing it will not have the updated PATH yet).
$Cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $Cloudflared) {
    $candidates = @(
        (Join-Path ${env:ProgramFiles(x86)} 'cloudflared\cloudflared.exe'),
        (Join-Path $env:ProgramFiles 'cloudflared\cloudflared.exe'),
        (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\cloudflared.exe')
    )
    $Cloudflared = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
}
if (-not $Cloudflared) {
    Write-Host 'cloudflared is not installed. Install it with: winget install --id Cloudflare.cloudflared'
    Write-Host 'Then close and reopen VS Code (or your terminal) and run this script again.'
    exit 1
}

function Get-HttpStatus([string]$Url) {
    try {
        $response = Invoke-WebRequest -Uri $Url -Headers @{ Accept = 'application/json' } -TimeoutSec 6 -UseBasicParsing
        return [int]$response.StatusCode
    } catch {
        if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
        return 0
    }
}

function Start-QuickTunnel([string]$Name, [int]$Port) {
    $log = Join-Path $LogDir "$Name.log"
    $process = Start-Process $Cloudflared -ArgumentList @('tunnel', '--no-autoupdate', '--url', "http://localhost:$Port") `
        -RedirectStandardError $log -RedirectStandardOutput (Join-Path $LogDir "$Name.out") -NoNewWindow -PassThru
    $script:TunnelProcesses += $process
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        $match = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if ($match) { return $match.Matches[0].Value }
    }
    Write-Host "Could not open the $Name tunnel. cloudflared output:"
    Get-Content $log -ErrorAction SilentlyContinue
    throw "Tunnel '$Name' did not start."
}

try {
    $localStatus = Get-HttpStatus "http://localhost:$ApiPort/api/v1/auth/me"
    if ($localStatus -ne 200 -and $localStatus -ne 401) {
        Write-Host "The EUEvent API is not answering on port $ApiPort (HTTP $localStatus). Start it first."
        exit 1
    }

    Write-Host 'Opening the API tunnel...'
    $apiBaseUrl = (Start-QuickTunnel 'api' $ApiPort) + '/api/v1'

    # New quick-tunnel hostnames can take a few seconds to resolve. Checking too early can make
    # Windows cache a failed DNS lookup, so wait briefly first.
    Start-Sleep -Seconds 8
    $publicStatus = 0
    for ($i = 0; $i -lt 20; $i++) {
        $publicStatus = Get-HttpStatus "$apiBaseUrl/auth/me"
        if ($publicStatus -eq 200 -or $publicStatus -eq 401) { break }
        Start-Sleep -Seconds 2
    }
    if ($publicStatus -ne 200 -and $publicStatus -ne 401) {
        Write-Host "Note: this computer could not reach $apiBaseUrl yet (HTTP $publicStatus). Phones usually can; try the link in a phone browser."
    }

    $dashboardUrl = $null
    if ((Get-HttpStatus "http://localhost:$DashboardPort/") -ne 0) {
        Write-Host 'Opening the dashboard tunnel...'
        $dashboardUrl = Start-QuickTunnel 'dashboard' $DashboardPort
    }

    Write-Host ''
    Write-Host '================ EUEvent public links ================'
    Write-Host "API (enter in the app's Server settings): $apiBaseUrl"
    if ($dashboardUrl) {
        Write-Host "Admin dashboard:                          $dashboardUrl"
    } else {
        Write-Host "Admin dashboard: not shared (start it with 'npm run dev' in admin-web\, then rerun)"
    }
    Write-Host '======================================================='
    Write-Host "Phones that saved an older server URL must update it in the app's Server settings."
    Write-Host ''

    if ($NoExpo) {
        Write-Host 'Tunnels are open. Press Ctrl+C to close them.'
        while ($true) { Start-Sleep -Seconds 5 }
    } else {
        Set-Location (Join-Path $RootDir 'security-scanner')
        $env:EXPO_PUBLIC_API_BASE_URL = $apiBaseUrl
        npx expo start --tunnel ngrok --go
    }
} finally {
    foreach ($process in $TunnelProcesses) {
        if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
    }
    Remove-Item -Recurse -Force $LogDir -ErrorAction SilentlyContinue
}
