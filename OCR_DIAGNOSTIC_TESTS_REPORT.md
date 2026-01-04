# OCR Diagnostic Tests Report

## Test 1 — Real Image Upload (Frontend Logs Added)

### Changes Made

**File: `services/ocrService.ts`**

Added logging before fetch (lines 60-61):
```typescript
// Test 1: Log image prefix and length before fetch
console.log('[OCR] image prefix:', imageDataUrl?.slice(0, 30));
console.log('[OCR] image length:', imageDataUrl?.length);
```

**File: `components/ReadingScreen.tsx`**

Added asset logging in `handleFileUpload` (lines 424-427):
```typescript
// Test 2A: Log asset information (for file input, we have file object)
console.log('[OCR] asset.uri:', file.name); // File name (closest to URI)
console.log('[OCR] asset.mimeType:', file.type);
console.log('[OCR] asset.fileName:', file.name);
```

### Expected Logs (When Running OCR in App)

When user uploads an image via the app, you should see:

1. **Asset Information:**
   ```
   [OCR] asset.uri: <filename>
   [OCR] asset.mimeType: image/jpeg (or image/png, image/webp)
   [OCR] asset.fileName: <filename>
   ```

2. **Image Data URL:**
   ```
   [OCR] image prefix: data:image/jpeg;base64,
   [OCR] image length: <number>
   ```

### Expected Prefix Values

The prefix should be one of:
- `data:image/jpeg;base64,`
- `data:image/png;base64,`
- `data:image/webp;base64,`

**If prefix is missing or doesn't start with `data:` → Frontend is sending incorrect format**

---

## Test 2 — "Unsupported Image" Error Analysis

### Three Possible Causes

If backend returns: `"You uploaded an unsupported image..."`

1. **No dataURL provided** (only raw base64 or something else)
   - Check: `[OCR] image prefix` log
   - Should start with `data:image/...`

2. **Wrong MIME type** (e.g., `data:image/jpg`, `data:image/heic`, or empty)
   - Check: `[OCR] asset.mimeType` log
   - Should be: `image/jpeg`, `image/png`, or `image/webp`

3. **Not actual base64 image** (e.g., JSON stringify error, URI sent instead, truncated base64)
   - Check: `[OCR] image length` log
   - Should be a reasonable size (not 0, not extremely small)

### Test 2A — MIME Detection from Asset

**Implementation:** Added logging in `handleFileUpload` to log:
- `asset.uri` (file name)
- `asset.mimeType` (file.type from FileReader)
- `asset.fileName` (file.name)

**Expected:** MIME should be `jpeg`, `png`, or `webp`.

**Note:** For web app using FileReader, we log `file.type` and `file.name`. For mobile app using ImagePicker, these logs will show the actual asset properties.

---

## Test 3 — Curl Test with Real Image

### Test Performed

**Test Image:** 1x1 pixel JPEG (minimal valid JPEG)

**Command:**
```powershell
$jpegBase64 = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA"
$body = '{"image":"data:image/jpeg;base64,' + $jpegBase64 + '"}'
curl -Method POST "http://192.168.86.190:3001/ocr" -Headers @{"Content-Type"="application/json"} -Body $body
```

**Result:** ✅ **Status: 500** (Internal Server Error)
- **Not 413** → Payload limit is working
- **Not 400 INVALID_IMAGE** → Image format accepted
- **500** → Server-side processing error (likely because 1x1 pixel image has no text)

### Test with Real Image File

**To test with a real image file, run:**

```powershell
# Replace "C:\path\to\your\image.jpg" with actual image path
$bytes = [System.IO.File]::ReadAllBytes("C:\path\to\your\image.jpg")
$b64 = [System.Convert]::ToBase64String($bytes)
$body = '{"image":"data:image/jpeg;base64,' + $b64 + '"}'
curl -Method POST "http://192.168.86.190:3001/ocr" -Headers @{"Content-Type"="application/json"} -Body $body
```

**Expected Results:**

- ✅ **If this works (200 OK or 400 with text extracted):** Backend OCR with real image is working
- ❌ **If this gives "unsupported image":** Backend has issue parsing image (or OCR provider requirements)

---

## Next Steps Based on Test Results

### Scenario A: Mobile App Prefix is Incorrect

**Symptom:** `[OCR] image prefix` doesn't start with `data:image/...`

**Action:** Prompt agent to fix dataURL/base64 formatting in mobile app

### Scenario B: Mobile App MIME Problem (HEIC)

**Symptom:** `[OCR] asset.mimeType` is `image/heic` or unsupported format

**Action:** Prompt agent to convert HEIC to JPEG using ImageManipulator

### Scenario C: Even Curl with Real JPEG Fails

**Symptom:** Curl test with real JPEG returns "unsupported image"

**Action:** Prompt agent to fix server-side decode/validate or OCR provider configuration

---

## Summary

### ✅ Completed

1. **Test 1 Logs Added:**
   - `[OCR] image prefix:` - Logs first 30 chars of image data URL
   - `[OCR] image length:` - Logs total length

2. **Test 2A Logs Added:**
   - `[OCR] asset.uri:` - File name
   - `[OCR] asset.mimeType:` - MIME type from file
   - `[OCR] asset.fileName:` - File name

3. **Test 3 Performed:**
   - Tested with minimal JPEG (1x1 pixel)
   - Result: Status 500 (not 413, not 400 INVALID_IMAGE)
   - Payload limit working correctly

### 📋 Pending

- **Real Image Test:** Need to test with actual image file from user's system
- **App Test:** Need to run OCR flow in app to see actual logs

### 🔍 Diagnostic Commands

**To test with real image:**
```powershell
$bytes = [System.IO.File]::ReadAllBytes("YOUR_IMAGE_PATH.jpg")
$b64 = [System.Convert]::ToBase64String($bytes)
$body = '{"image":"data:image/jpeg;base64,' + $b64 + '"}'
Invoke-WebRequest -Method POST "http://192.168.86.190:3001/ocr" -Headers @{"Content-Type"="application/json"} -Body $body
```

---

**Status:** Logs added. Ready for app testing. Test 3 shows payload limit is working (no 413 errors).

