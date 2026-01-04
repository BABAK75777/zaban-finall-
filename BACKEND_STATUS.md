# وضعیت Backend API - تثبیت نهایی

**تاریخ بررسی:** $(date)  
**وضعیت:** ✅ تثبیت شده و آماده برای توسعه

---

## 📋 خلاصه وضعیت

| سرویس | وضعیت | API Key | لاگ‌ها | توضیحات |
|--------|-------|---------|--------|---------|
| **TTS (Streaming)** | ✅ **کامل و سالم** | ✅ OpenAI | ✅ کامل | Session-based با SSE |
| **OCR** | ✅ **کامل و سالم** | ✅ OpenAI | ✅ کامل | Image → Text با OpenAI Vision |
| **Shadow** | ⚠️ **پایه‌ای** | ❌ نیاز ندارد | ✅ کامل | Transcription هنوز integrate نشده |

---

## 1️⃣ TTS (Streaming) - ✅ تثبیت شده

### وضعیت: **کاملاً سالم و نیاز به تغییر ندارد**

### Endpoints

#### `POST /tts/session`
- **وظیفه:** ایجاد Session جدید برای TTS Streaming
- **Input:**
  ```json
  {
    "text": "... long text ...",
    "chunkMaxChars": 1600,
    "speed": 1.0
  }
  ```
- **Output:**
  ```json
  {
    "ok": true,
    "sessionId": "sess_abc123",
    "requestId": "req_xyz789",
    "totalChunks": 18
  }
  ```

#### `GET /tts/session/:sessionId/stream`
- **وظیفه:** SSE Stream برای دریافت chunks به صورت real-time
- **Events:**
  - `meta`: اطلاعات اولیه session
  - `chunk`: هر chunk آماده شده
  - `progress`: پیشرفت تولید
  - `error`: خطا در تولید chunk
  - `done`: اتمام تولید

#### `POST /tts/session/:sessionId/cancel`
- **وظیفه:** لغو Session

#### `GET /tts/session/:sessionId/chunk/:index`
- **وظیفه:** دریافت chunk خاص (fallback برای mobile)

### لاگ‌ها (Expected Log Flow)

✅ **Session Creation:**
```
[TTS:Session:${requestId}] Creating session: {...}
[TTS:Session:DIAG:${requestId}] 📥 POST /tts/session request received: {...}
[TTS:Session:${sessionId}] ✅ Session created: {...}
[TTS:Session:DIAG:${sessionId}] ✅ Session created response: {...}
```

✅ **SSE Connect:**
```
[TTS:Session:${sessionId}] SSE client connected
[TTS:Session:DIAG:${sessionId}] 🔌 SSE client connected: {...}
```

✅ **Chunk Generation:**
```
[TTS:Session:DIAG:${sessionId}] 🚀 Starting chunk generation (async): {...}
[TTS:Session:DIAG:${sessionId}] 🚀 generateChunksForSession starting: {...}
[TTS:Session:DIAG:${sessionId}] 📦 Generating chunk ${i+1}/${total}: {...}
[TTS:Session:DIAG:${sessionId}] ✅ Chunk ${i} generated: {...}
[TTS:Session:DIAG:${sessionId}] 📤 Chunk ${i} event sent to SSE client
```

✅ **Progress Events:**
```
[TTS:Session:DIAG:${sessionId}] 📊 Sending progress update: {...}
[TTS:Session:DIAG:${sessionId}] 📤 Progress event sent to SSE client: {...}
```

✅ **Completion:**
```
[TTS:Session:${sessionId}] ✅ All chunks generated
```

✅ **Cancellation:**
```
[TTS:Session:${sessionId}] Generation cancelled at chunk ${i}
[TTS:Session:DIAG:${sessionId}] ⏹️  Generation cancelled: {...}
```

### OpenAI API Key Detection

✅ **Startup Log:**
```
[TTS] OpenAI API key found (length: XX)
```

✅ **Runtime Check:**
- در `generateChunksForSession` بررسی می‌شود
- اگر موجود نباشد: `[TTS:Session:${sessionId}] No API key configured`

### معماری

- **Session Manager:** `ttsSessionManager.js` - مدیریت در-memory sessions با TTL
- **Chunk Generator:** `ttsChunkGenerator.js` - تولید audio با retry logic
- **Text Chunker:** `textChunker.js` - تقسیم متن به chunks
- **Cache:** File-based cache در `backend/cache/tts/`

### نکات مهم

1. ✅ Session-based architecture برای long texts
2. ✅ SSE برای real-time streaming
3. ✅ Cache integration برای performance
4. ✅ Retry logic در chunk generation
5. ✅ TTL-based cleanup برای sessions
6. ✅ Comprehensive logging برای debugging

---

## 2️⃣ OCR (Image → Text) - ✅ تثبیت شده

### وضعیت: **کاملاً سالم و از نظر معماری درست است**

### Endpoint

#### `POST /ocr`
- **وظیفه:** استخراج متن از تصویر با OpenAI Vision
- **Input:**
  ```json
  {
    "image": "data:image/png;base64,..." // یا base64 خالص
  }
  ```
- **Output (Success):**
  ```json
  {
    "ok": true,
    "text": "extracted text..."
  }
  ```
- **Output (Error):**
  ```json
  {
    "ok": false,
    "error": "ERROR_CODE",
    "debugId": "...",
    "details": "..."
  }
  ```

### Validation & Error Handling

✅ **Fail-Fast API Key Check:**
```javascript
const apiKey = getOpenAIApiKey();
if (!apiKey) {
  return res.status(500).json({
    ok: false,
    error: 'API_KEY_MISSING',
    debugId: requestId,
    details: 'OpenAI API key not configured.'
  });
}
```

✅ **Input Validation:**
- بررسی وجود `image` field
- بررسی type (string)
- استخراج base64 از data URL
- بررسی طول minimum (100 chars)

✅ **MimeType Extraction:**
- از data URL: `data:image/png;base64,...`
- Default: `image/png`

### لاگ‌ها

✅ **Request Received:**
```
[OCR:${requestId}] Request received
```

✅ **Processing:**
```
[OCR:${requestId}] Processing image: {
  mimeType: "...",
  base64Length: ...,
  estimatedSizeKB: ...
}
```

✅ **Success:**
```
[OCR:${requestId}] ✅ Text extracted: {
  textLength: ...,
  duration: "...ms"
}
```

✅ **Errors:**
```
[OCR:${requestId}] ❌ Error: {
  message: "...",
  name: "...",
  status: ...,
  code: ...,
  duration: "...ms",
  stack: "..."
}
```

### Error Codes

| Code | HTTP Status | توضیحات |
|------|-------------|---------|
| `API_KEY_MISSING` | 500 | OpenAI API key موجود نیست |
| `INVALID_INPUT` | 400 | image field missing یا invalid |
| `INVALID_IMAGE` | 400 | Image data خیلی کوتاه یا invalid |
| `API_KEY_INVALID` | 500 | API key نامعتبر یا expired |
| `RATE_LIMIT` | 429 | Rate limit exceeded |
| `OCR_FAILED` | 500 | خطای عمومی OCR |

### OpenAI Vision API

✅ **Model:** `gpt-4o`  
✅ **System Prompt:** "Extract all readable text exactly. Preserve line breaks. No extra commentary."  
✅ **Max Tokens:** 4096

### نکات مهم

1. ✅ Fail-fast validation برای API key
2. ✅ Validation کامل ورودی (base64 / data URL)
3. ✅ استخراج صحیح mimeType
4. ✅ Error handling جامع
5. ✅ لاگ‌های کامل برای debugging
6. ✅ Response format استاندارد: `{ ok, text }` یا `{ ok, error, debugId }`

---

## 3️⃣ Shadow (User Audio Analysis) - ⚠️ پایه‌ای

### وضعیت: **پیاده‌سازی پایه - Transcription هنوز integrate نشده**

### Endpoint

#### `POST /shadow`
- **وظیفه:** تحلیل و transcription صدای کاربر
- **Input:**
  ```json
  {
    "audio": "base64_encoded_audio_data",
    "mimeType": "audio/webm" // یا "audio/wav"
  }
  ```
- **Output (Current - Placeholder):**
  ```json
  {
    "ok": true,
    "transcript": "[Transcription service not yet integrated]",
    "score": 0.85,
    "audioSize": ...,
    "message": "Audio received successfully. Transcription service integration pending."
  }
  ```

### وضعیت فعلی

✅ **Validation:**
- بررسی وجود `audio` field
- بررسی type (string)
- بررسی minimum length (100 chars)
- Decode base64 به Buffer

✅ **Error Handling:**
- `INVALID_INPUT`: audio field missing
- `INVALID_AUDIO`: audio data خیلی کوتاه
- `INVALID_BASE64`: decode failed
- `SHADOW_FAILED`: خطای عمومی

✅ **لاگ‌ها:**
```
[Shadow:${requestId}] Request received
[Shadow:${requestId}] Processing audio: {...}
[Shadow:${requestId}] ✅ Audio processed: {...}
[Shadow:${requestId}] ❌ Error: {...}
```

### TODO برای ادامه توسعه

⚠️ **Transcription Integration:**
- [ ] Integrate با OpenAI Whisper API
- [ ] یا سرویس transcription دیگر
- [ ] Score calculation برای accuracy
- [ ] Comparison با reference text (اگر موجود باشد)

### نکات مهم

1. ✅ Validation و error handling کامل است
2. ✅ لاگ‌ها کامل هستند
3. ⚠️ Transcription service هنوز integrate نشده
4. ✅ Response format آماده برای integration

---

## 🔧 Environment Variables

### Required

```env
# OpenAI API Key (برای TTS و OCR)
OPENAI_API_KEY=sk-...

# یا fallback options:
OCR_OPENAI_API_KEY=sk-...
API_KEY=sk-...
```

### Optional

```env
# TTS Dev Fallback (برای testing بدون API key)
TTS_DEV_FALLBACK_SILENT_WAV=true

# Google API Key (برای TTS Session chunks - اگر استفاده می‌شود)
GOOGLE_API_KEY=...

# Database (برای production با JWT auth)
DB_HOST=...
DB_USER=...
DB_NAME=...
DB_PASSWORD=...

# Auth Mode
AUTH_MODE=guest  # یا 'jwt' برای production
```

---

## 📊 Health Check Endpoints

### `GET /health`
```json
{
  "ok": true,
  "ocr": {
    "enabled": true,
    "keyConfigured": true
  }
}
```

### `GET /healthz`
```json
{
  "ok": true
}
```

### `GET /readyz`
```json
{
  "ok": true,
  "checks": {
    "server": true,
    "database": true
  }
}
```

---

## 🎯 خلاصه و نتیجه‌گیری

### ✅ TTS (Streaming)
- **وضعیت:** کاملاً سالم و نیاز به تغییر ندارد
- **لاگ‌ها:** کامل و مطابق Expected Log Flow
- **API Key:** شناسایی می‌شود و لاگ می‌شود
- **عملکرد:** Session-based با SSE، cache، retry logic

### ✅ OCR
- **وضعیت:** از نظر معماری و پیاده‌سازی درست است
- **Validation:** کامل (base64 / data URL)
- **Error Handling:** منطقی و واقعی (نه باگ)
- **API Key:** Fail-fast validation

### ⚠️ Shadow
- **وضعیت:** پیاده‌سازی پایه - آماده برای integration
- **Validation:** کامل
- **TODO:** Transcription service integration

---

## 🚀 آماده برای ادامه توسعه

1. ✅ **TTS:** بدون تغییر - کاملاً stable
2. ✅ **OCR:** بدون تغییر - کاملاً stable
3. ⚠️ **Shadow:** نیاز به integration transcription service

**توصیه:** می‌توانید با اطمینان ادامه توسعه را شروع کنید. TTS و OCR کاملاً stable هستند.

---

**تاریخ آخرین بررسی:** $(date)  
**نسخه:** 1.0.0

