# Install on USB-connected Android phone.
# Usage:
#   .\run-demo-android.ps1              # dev build + Metro (live reload)
#   .\run-demo-android.ps1 -SkipBuild   # Metro + launch only
#   .\run-demo-android.ps1 -Standalone    # release APK with JS inside — no Metro / no 8081

param(
  [switch]$SkipBuild,
  [switch]$Standalone
)

$ErrorActionPreference = 'Stop'
$MobileRoot = $PSScriptRoot
$AndroidPackage = 'com.babakworks.mamlio'
$AndroidDir = Join-Path $MobileRoot 'android'

function Get-AdbDevice {
  # Force array: single match must not become a string (else [0] is first char only).
  $lines = @(adb devices 2>$null | Select-Object -Skip 1 | Where-Object { $_ -match '\sdevice\s*$' })
  if ($lines.Count -eq 0) {
    throw 'No Android device found. Enable USB debugging and connect the phone.'
  }
  if ($lines.Count -gt 1) {
    Write-Warning "Multiple devices connected; using the first one."
  }
  return ($lines[0] -replace '\s+device\s*$', '').Trim()
}

function Test-PortListening([int]$Port) {
  $match = netstat -ano | Select-String ":$Port\s" | Select-String 'LISTENING'
  return [bool]$match
}

function Stop-MetroOnPort([int]$Port = 8081) {
  $lines = @(netstat -ano | Select-String ":$Port\s" | Select-String 'LISTENING')
  foreach ($line in $lines) {
    $procId = ($line.ToString() -replace '^\s+|\s+$', '' -split '\s+')[-1]
    if ($procId -match '^\d+$') {
      Write-Host "Stopping process $procId on port $Port..."
      Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue
    }
  }
  Start-Sleep -Seconds 2
}

function Wait-MetroReady([int]$Port = 8081, [int]$TimeoutSec = 60) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $status = curl.exe -s -m 3 "http://127.0.0.1:$Port/status" 2>$null
      if ($status -match 'running') { return $true }
    } catch { }
    Start-Sleep -Seconds 2
  }
  return $false
}

function Invoke-Adb([string]$Device, [string[]]$AdbArgs) {
  & adb -s $Device @AdbArgs
  if ($LASTEXITCODE -ne 0) {
    throw "adb $($AdbArgs -join ' ') failed (exit $LASTEXITCODE)"
  }
}

Push-Location $MobileRoot
try {
  $device = Get-AdbDevice
  Write-Host "Device: $device"

  if ($Standalone) {
    Write-Host 'Building standalone release APK (JS bundled inside — no Metro needed)...'
    Push-Location $AndroidDir
    try {
      & .\gradlew.bat assembleRelease
      if ($LASTEXITCODE -ne 0) { throw "Gradle assembleRelease failed (exit $LASTEXITCODE)" }
    } finally {
      Pop-Location
    }
    $apk = Join-Path $AndroidDir 'app\build\outputs\apk\release\app-release.apk'
    if (-not (Test-Path $apk)) { throw "APK not found: $apk" }
    Invoke-Adb $device @('install', '-r', $apk)
    Invoke-Adb $device @('shell', 'am', 'force-stop', $AndroidPackage)
    Invoke-Adb $device @('shell', 'am', 'start', '-n', "$AndroidPackage/.MainActivity")
    Write-Host ''
    Write-Host 'Standalone demo installed. No USB/Metro required after this.'
    Write-Host 'Icons: Menu -> Settings (AI Speed) or Menu -> Settings -> AI.'
    return
  }

  if (-not $SkipBuild) {
    Write-Host 'Building and installing debug APK...'
    Push-Location $AndroidDir
    try {
      & .\gradlew.bat app:installDebug -PreactNativeDevServerPort=8081
      if ($LASTEXITCODE -ne 0) { throw "Gradle install failed (exit $LASTEXITCODE)" }
    } finally {
      Pop-Location
    }
  }

  Invoke-Adb $device @('reverse', '--remove-all')
  Invoke-Adb $device @('reverse', 'tcp:8081', 'tcp:8081')
  Write-Host 'USB port forward: phone localhost:8081 -> PC:8081'

  if (Test-PortListening 8081) {
    Write-Host 'Stopping existing Metro on port 8081 (may be in a bad watch state)...'
    Stop-MetroOnPort 8081
  }

  Write-Host 'Starting Metro on port 8081...'
  $env:METRO_USE_WATCHMAN = 'false'
  Remove-Item Env:CHOKIDAR_USEPOLLING -ErrorAction SilentlyContinue
  Start-Process -FilePath 'node' `
    -ArgumentList @(
      (Join-Path $MobileRoot 'node_modules\expo\bin\cli'),
      'start',
      '--dev-client',
      '--port',
      '8081',
      '--localhost',
      '--clear'
    ) `
    -WorkingDirectory $MobileRoot `
    -WindowStyle Normal

  if (-not (Wait-MetroReady)) {
    throw 'Metro is not responding on port 8081. Close other Metro windows and run again.'
  }
  Write-Host 'Metro ready.'

  curl.exe -s -m 5 -X POST 'http://127.0.0.1:8081/reload' | Out-Null
  Invoke-Adb $device @('shell', 'am', 'force-stop', $AndroidPackage)
  Invoke-Adb $device @('shell', 'am', 'start', '-n', "$AndroidPackage/.MainActivity")
  Write-Host ''
  Write-Host 'Mamlio launched. Keep USB connected for live reload.'
  Write-Host 'If white screen + 8081 error: run  npm run demo:android:standalone'
} finally {
  Pop-Location
}
