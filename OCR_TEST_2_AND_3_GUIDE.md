# OCR Test 2 & 3 — Real Image Testing Guide

## Test 2 — Curl with Real Image

### Prerequisites

1. Place a real image file (JPEG) on your system, e.g.:
   - `C:\temp\real.jpg`
   - Or any path to a real photo (200KB-1MB typical mobile photo size)

### Method 1: Using the Test Script

```powershell
.\test-ocr-real-image.ps1 "C:\temp\real.jpg"
```

### Method 2: Direct PowerShell Command

```powershell
$bytes = [System.IO.File]::ReadAllBytes("C:\temp\real.jpg")
$b64 = [System.Convert]::ToBase64String($bytes)
$body = '{"image":"data:image/jpeg;base64,' + $b64 + '"}'
curl -Method POST "http://192.168.86.190:3001/ocr" -Headers @{"Content-Type"="application/json"} -Body $body
```

### Expected Output

**✅ If successful:**
```json
{
  "ok": true,
  "text": "extracted text here..."
}
```

**❌ If error:**
```json
{
  "ok": false,
  "error": "ERROR_CODE",
  "details": "..."
}
```

**📋 Required:** Send the **complete JSON response** from curl.

---

## Test 3 — Backend Server Logs

### How to Check Server Logs

1. **Open the terminal where backend server is running**
2. **Run the curl command from Test 2**
3. **Immediately check the backend terminal** for error logs

### What to Look For

Look for lines containing:
- `[OCR:requestId]`
- `Error:`
- `❌`
- Stack traces
- OpenAI API errors
- Image processing errors

### Expected Log Format

```
[OCR:abc123] Request received
[OCR:abc123] Processing image: { mimeType: 'image/jpeg', ... }
[OCR:abc123] ❌ Error: { message: '...', ... }
```

**📋 Required:** Copy the **5-10 lines of error logs** from backend terminal.

---

## Result Analysis — Scenarios

### Scenario A: Image Prefix is Wrong

**Symptom:** `[OCR] image prefix` is NOT one of:
- `data:image/jpeg;base64,`
- `data:image/png;base64,`
- `data:image/webp;base64,`

**Possible causes:**
- `imageDataUrl` is null
- DataURL not constructed correctly
- Base64 encoding issue

**Next Action:** Fix dataURL/base64 construction in ImagePicker/Camera/FileSystem path.

---

### Scenario B: MIME Type is HEIC or Unsupported

**Symptom:** `[OCR] asset.mimeType` is:
- `image/heic`
- `image/heif`
- Other unsupported format

**Cause:** iPhone/some Android devices use HEIC format, which OCR provider doesn't accept.

**Next Action:** Convert HEIC to JPEG using ImageManipulator before base64 encoding.

---

### Scenario C: Prefix is Correct, But Length is Too Large

**Symptom:** `[OCR] image length` is > 4,000,000 characters

**Possible causes:**
- Image too large (high resolution)
- OCR provider has internal limits
- Timeout issues

**Next Action:** 
- Resize/compress image in frontend
- Set MAX_LEN limit
- Implement image optimization

---

### Scenario D: Curl with Real Image Returns 500

**Symptom:** 
- Test 1x1 pixel JPEG → 500 (expected, no text)
- Real image JPEG → 500 (unexpected)

**Analysis:**
- If 1x1 gives 500 → Normal (no text to extract)
- If real image gives 500 → **Server-side OCR processing issue**

**Next Action:** 
1. Check backend server logs (Test 3)
2. Look for OCR provider errors
3. Check OpenAI API key configuration
4. Verify image decoding on server side

**Important:** This indicates the problem is **NOT in frontend**, but in backend OCR processing.

---

## Test Results Template

### Test 2 Results

```
Image Path: C:\temp\real.jpg
Image Size: XXX bytes
Base64 Length: XXX characters
Payload Length: XXX characters

Status Code: XXX
Response Body:
{
  "ok": ...,
  "error": ...,
  "details": ...
}
```

### Test 3 Results

```
Backend Logs:
[OCR:xxx] Request received
[OCR:xxx] Processing image: ...
[OCR:xxx] ❌ Error: ...
...
```

---

## Next Steps Based on Results

### If Test 2 Returns 200 OK:
✅ **Backend OCR is working correctly**
- Frontend issue likely (prefix, mime, or encoding)
- Check app logs (Test 1) for prefix/mime issues

### If Test 2 Returns 400 INVALID_IMAGE:
❌ **Image format issue**
- Check if image is valid JPEG
- Verify base64 encoding
- Check server-side image validation

### If Test 2 Returns 500:
❌ **Server-side processing error**
- Check Test 3 logs for details
- Likely OCR provider issue (OpenAI API)
- Check API key configuration
- Verify image decoding

### If Test 2 Returns 413:
❌ **Payload still too large**
- Check if body limit was applied correctly
- Verify server restart
- Check for other middleware limits

---

## Quick Reference

**Test Script Location:** `test-ocr-real-image.ps1`

**Backend Server:** `http://192.168.86.190:3001`

**OCR Endpoint:** `POST /ocr`

**Required Headers:** `Content-Type: application/json`

**Body Format:** `{"image":"data:image/jpeg;base64,<base64_string>"}`

---

**Status:** Ready for testing. Run Test 2 with a real image and share the results.

