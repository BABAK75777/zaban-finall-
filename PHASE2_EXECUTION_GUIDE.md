# Phase 2: TTS Response Contract & Audio Delivery Test

## هدف
بررسی اینکه backend response contract استاندارد است و UI درست error handling می‌کند.

---

## Prerequisites

✅ Phase 1 باید PASS باشد  
✅ Frontend و Backend باید running باشند  
✅ Backend باید تغییرات Phase 2 را داشته باشد (standardized response contract)

---

## Setup

### 1. Chrome DevTools
- **Network tab** را باز کن
- **Preserve log**: ✅ ON
- **Filter**: `tts`

### 2. Frontend Console
- Chrome DevTools → **Console tab**
- آماده باش برای دیدن response logs

### 3. UI Observation
- آماده باش برای مشاهده UI state changes

---

## Test 1: Normal Playback (Success Case)

### Execution

1. **Network tab را clear کن**
2. **Console tab را clear کن**
3. **دکمه "Hear AI" را بزن** (با متن معتبر)
4. **صبر کن** تا request کامل شود و audio پخش شود

### Evidence Collection

**Network Tab → POST /tts Response:**

1. **Response را باز کن** (click on request)
2. **Response tab** را ببین
3. **Response body را بررسی کن:**

```json
{
  "ok": true,
  "audioBase64": "...",
  "mimeType": "audio/mpeg",
  "durationMsEstimate": 1234
}
```

**جمع‌آوری:**
- `ok`: true / false
- `mimeType`: <exact value> (مثلاً "audio/mpeg", "audio/wav")
- `audioBase64_length`: <number> (طول string audioBase64)

**UI Observation:**

بعد از request کامل شد:
- UI state چیست؟
  - `playing` (audio در حال پخش است)
  - `idle` (audio تمام شده)
  - `loading` (هنوز در حال load است)
  - `error` (error نمایش داده می‌شود)

**Console Tab:**

- آیا error وجود دارد؟
- آیا response log وجود دارد؟

---

## Test 2: Error Case

### Execution Options

**Option A: Empty Text**
1. متن را خالی کن (یا فقط space بگذار)
2. دکمه "Hear AI" را بزن

**Option B: Invalid API Key** (اگر ممکن است)
1. API key را در backend تغییر بده (یا invalid کن)
2. دکمه "Hear AI" را بزن

**Option C: Provider Error Simulation**
1. Backend را stop کن
2. دکمه "Hear AI" را بزن
3. Backend را restart کن

### Evidence Collection

**Network Tab → POST /tts Response:**

1. **Response را باز کن**
2. **Response body را بررسی کن:**

```json
{
  "ok": false,
  "error": "NO_AUDIO" | "PROVIDER_ERROR",
  "debugId": "...",
  "details": "..."
}
```

**جمع‌آوری:**
- `ok`: false
- `error`: <exact value> (NO_AUDIO / PROVIDER_ERROR)
- `debugId_present`: yes / no (آیا debugId وجود دارد؟)

**UI Observation:**

بعد از error:
- UI state چیست؟
  - `error` (error message نمایش داده می‌شود)
  - `idle` (به idle برگشته)
  - `hung` (در loading/buffering گیر کرده) ❌

**Critical Check:**
- آیا UI از buffering خارج شد؟ (نه "Buffering 0/1" stuck)
- آیا error message نمایش داده می‌شود؟
- آیا buttons قابل کلیک هستند؟ (UI frozen نیست)

**Console Tab:**

- Error message چیست؟
- آیا debugId در error log هست؟

---

## Data Collection Template

### Normal Playback

```
Response Body:
- ok: true / false
- mimeType: _______________
- audioBase64_length: _______________

UI State After:
- State: playing / idle / loading / error
- Audio playing: yes / no
- Error visible: yes / no
```

### Error Case

```
Response Body:
- ok: false
- error: NO_AUDIO / PROVIDER_ERROR / other
- debugId_present: yes / no
- debugId value: _______________

UI State After:
- State: error / idle / hung
- Error message visible: yes / no
- UI frozen: yes / no
- Buttons clickable: yes / no
- Buffering stuck: yes / no
```

---

## Output Format

بعد از جمع‌آوری evidence، خروجی را در این فرمت بده:

```
PHASE2_TEST_RESULT:
- Normal: {ok: true/false, mimeType: <value>, audioBase64_length: <number>, UI_state_after: <value>}
- ErrorCase: {ok: false, error: <value>, debugId_present: yes/no, UI_state_after: <value>}
```

### Example:

```
PHASE2_TEST_RESULT:
- Normal: {ok: true, mimeType: audio/mpeg, audioBase64_length: 45678, UI_state_after: playing}
- ErrorCase: {ok: false, error: NO_AUDIO, debugId_present: yes, UI_state_after: error}
```

---

## PASS Criteria

✅ **Phase 2 PASS اگر:**

**Normal:**
- `ok: true`
- `audioBase64_length > 1000` (حداقل 1KB audio data)
- `mimeType` موجود و معتبر (audio/mpeg, audio/wav, etc.)
- `UI_state_after` = playing یا idle (نه error)

**ErrorCase:**
- `ok: false`
- `error` = NO_AUDIO یا PROVIDER_ERROR
- `debugId_present` = yes
- `UI_state_after` = error یا idle (NOT hung)
- UI از buffering خارج شد
- Error message نمایش داده می‌شود
- UI frozen نیست

❌ **Phase 2 FAIL اگر:**

**Normal:**
- `ok: false`
- `audioBase64_length < 1000`
- `mimeType` موجود نیست
- `UI_state_after` = error

**ErrorCase:**
- `ok: true` (نباید success باشد)
- `debugId_present` = no
- `UI_state_after` = hung (در buffering گیر کرده)
- UI frozen است
- Error message نمایش داده نمی‌شود

---

## Troubleshooting

**اگر Normal fail شد:**
- Network tab → Response را بررسی کن
- آیا response format درست است؟
- آیا audioBase64 موجود است؟
- Console errors را بررسی کن

**اگر ErrorCase hang کرد:**
- Console errors را بررسی کن
- Network tab → آیا request fail شده؟
- UI state را بررسی کن (buffering stuck?)
- Backend console → آیا error log وجود دارد؟

**اگر debugId موجود نیست:**
- Backend را بررسی کن که error response شامل debugId است
- Response body را دوباره بررسی کن

---

## Notes

- `audioBase64_length` باید عدد باشد (طول string)
- `mimeType` باید دقیق باشد (مثلاً "audio/mpeg" نه "mp3")
- `UI_state_after` باید دقیق باشد (playing/idle/error/hung)
- ErrorCase باید hang نکند (critical check)

