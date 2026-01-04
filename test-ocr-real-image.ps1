# OCR Test Script - Real Image
# Usage: .\test-ocr-real-image.ps1 "C:\path\to\your\image.jpg"

param(
    [Parameter(Mandatory=$true)]
    [string]$ImagePath
)

if (-not (Test-Path $ImagePath)) {
    Write-Host "Error: Image file not found: $ImagePath" -ForegroundColor Red
    exit 1
}

Write-Host "Reading image: $ImagePath" -ForegroundColor Cyan
$bytes = [System.IO.File]::ReadAllBytes($ImagePath)
$b64 = [System.Convert]::ToBase64String($bytes)
$body = '{"image":"data:image/jpeg;base64,' + $b64 + '"}'

Write-Host "`nImage Info:" -ForegroundColor Cyan
Write-Host "  File size: $($bytes.Length) bytes"
Write-Host "  Base64 length: $($b64.Length) characters"
Write-Host "  Total payload length: $($body.Length) characters"

Write-Host "`nSending request to OCR endpoint..." -ForegroundColor Cyan
Write-Host "=" * 60

try {
    $response = Invoke-WebRequest -Method POST "http://192.168.86.190:3001/ocr" `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "`n✅ SUCCESS" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "`nResponse Body:" -ForegroundColor Yellow
    Write-Host $response.Content
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "`n❌ ERROR" -ForegroundColor Red
    Write-Host "Status Code: $statusCode" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "`nResponse Body:" -ForegroundColor Yellow
        Write-Host $responseBody
    } else {
        Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n" + ("=" * 60)
Write-Host "`nNote: Check backend server logs for detailed error information." -ForegroundColor Cyan

