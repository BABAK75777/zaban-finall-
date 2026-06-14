# Mobile integration smoke: themes + rapid button taps (no hang)
param(
  [string]$Serial = "R5CW41YL50T"
)

$ErrorActionPreference = "Continue"
$pkg = "com.zaban.tts"

function Get-Focus {
  $line = adb -s $Serial shell dumpsys window 2>$null | Select-String "mCurrentFocus" | Select-Object -First 1
  return "$line"
}

function Tap([int]$x, [int]$y) {
  adb -s $Serial shell input tap $x $y | Out-Null
}

Write-Host "=== Integration smoke test ==="
adb -s $Serial reverse tcp:3001 tcp:3001 | Out-Null
adb -s $Serial reverse tcp:8081 tcp:8081 | Out-Null

adb -s $Serial shell am force-stop $pkg
adb -s $Serial shell am start -n "$pkg/.MainActivity" | Out-Null
Start-Sleep -Seconds 20

$focus0 = Get-Focus
if ($focus0 -notmatch $pkg) {
  Write-Host "FAIL: app did not launch. Focus: $focus0"
  exit 1
}
Write-Host "PASS: app launched"

# Rapid Shadow-only taps (recording race regression)
Write-Host ">> Shadow rapid tap stress"
for ($round = 0; $round -lt 15; $round++) {
  adb -s $Serial shell input tap 360 1100
  Start-Sleep -Milliseconds 80
}

Start-Sleep -Seconds 2
$focusShadow = Get-Focus
if ($focusShadow -notmatch $pkg) {
  Write-Host "FAIL: app hung after Shadow spam. Focus: $focusShadow"
  exit 1
}
Write-Host "PASS: Shadow rapid taps"

# Theme cycle (Dark -> Light -> Cream)
$themes = @(
  @{ name = "light"; x = 360; y = 340 },
  @{ name = "cream"; x = 590; y = 340 },
  @{ name = "dark"; x = 130; y = 340 }
)

foreach ($t in $themes) {
  Tap 52 95
  Start-Sleep -Milliseconds 900
  Tap $t.x $t.y
  Start-Sleep -Milliseconds 700
  Tap 360 1200
  Start-Sleep -Milliseconds 900
  $f = Get-Focus
  if ($f -notmatch $pkg) {
    Write-Host "FAIL: lost focus after theme $($t.name). $f"
    exit 1
  }
  Write-Host "PASS: theme $($t.name)"
}

# Rapid button spam on main screen (AI, Shadow, Next, Back)
$buttons = @(
  @{ name = "ai"; x = 360; y = 980 },
  @{ name = "shadow"; x = 360; y = 1100 },
  @{ name = "next"; x = 560; y = 1280 },
  @{ name = "back"; x = 160; y = 1280 }
)

for ($round = 0; $round -lt 8; $round++) {
  foreach ($b in $buttons) {
    Tap $b.x $b.y
    Start-Sleep -Milliseconds 120
  }
}

Start-Sleep -Seconds 3
$focus1 = Get-Focus
if ($focus1 -notmatch $pkg) {
  Write-Host "FAIL: app hung or crashed after button spam. Focus: $focus1"
  exit 1
}

$anr = adb -s $Serial shell dumpsys activity anr 2>$null | Select-String "com.zaban.tts" | Select-Object -First 1
if ($anr) {
  Write-Host "WARN: possible ANR: $anr"
}

Write-Host "PASS: survived rapid button taps"
Write-Host "Focus: $focus1"
Write-Host "=== All smoke checks passed ==="
exit 0
