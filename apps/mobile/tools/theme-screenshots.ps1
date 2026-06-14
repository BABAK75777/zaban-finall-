# Capture theme validation screenshots via Settings theme switcher
param(
  [string]$Serial = "R5CW41YL50T",
  [string]$OutDir = (Join-Path $PSScriptRoot "..")
)

$ErrorActionPreference = "Continue"

function Save-Cap([string]$name) {
  $remote = "/sdcard/theme-cap-$name.png"
  $out = Join-Path $OutDir "theme-validation-$name.png"
  adb -s $Serial shell screencap -p $remote | Out-Null
  adb -s $Serial pull $remote $out | Out-Null
  adb -s $Serial shell rm $remote | Out-Null
  Write-Host "   Saved $out ($((Get-Item $out).Length) bytes)"
}

function Close-Settings {
  adb -s $Serial shell input tap 360 1200
  Start-Sleep -Milliseconds 800
}

function Open-Settings {
  adb -s $Serial shell input tap 52 95
  Start-Sleep -Seconds 1
}

$themeTabs = @(
  @{ name = "dark"; x = 130; y = 340 },
  @{ name = "light"; x = 360; y = 340 },
  @{ name = "cream"; x = 590; y = 340 }
)

Write-Host "=== Theme screenshot capture ==="
adb -s $Serial reverse tcp:8081 tcp:8081 | Out-Null
adb -s $Serial shell am force-stop com.zaban.tts
adb -s $Serial shell am start -n com.zaban.tts/.MainActivity
Start-Sleep -Seconds 24

foreach ($t in $themeTabs) {
  Write-Host ">> Theme: $($t.name)"
  Open-Settings
  adb -s $Serial shell input tap $t.x $t.y
  Start-Sleep -Seconds 1
  Close-Settings
  Start-Sleep -Seconds 2
  Save-Cap $t.name
}

$focus = adb -s $Serial shell dumpsys window 2>$null | Select-String "mCurrentFocus"
Write-Host "Focus: $focus"
Write-Host "Done."
