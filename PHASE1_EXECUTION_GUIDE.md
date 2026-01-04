# Phase 1: CORS & Request Reachability Test

## هدف
بررسی اینکه درخواست‌های `/tts` به backend می‌رسند و CORS درست کار می‌کند.

---

## Prerequisites

✅ Phase 0 باید کامل شده باشد  
✅ Frontend و Backend باید running باشند  
✅ Backend باید تغییرات Phase 1 را داشته باشد (CORS config + `[TTS] hit` log)

---

## Setup

### 1. Chrome DevTools
- **Network tab** را باز کن
- **Preserve log**: ✅ ON
- **Filter**: `tts`

### 2. Backend Console
- Terminal که backend را اجرا می‌کند را باز کن
- آماده باش برای دیدن `[TTS] hit` log

### 3. Frontend Console
- Chrome DevTools → **Console tab**
- آماده باش برای دیدن CORS errors

---

## Test Execution

### Test 1: Normal Playback

1. **Network tab را clear کن** (اگر نیاز است)
2. **Backend console را clear کن** (Ctrl+L)
3. **دکمه "Hear AI" را بزن** (بدون تغییر speed)
4. **صبر کن** تا request کامل شود (5-10 ثانیه)

**جمع‌آوری Evidence:**

**Network Tab:**
- آیا **OPTIONS** request وجود دارد؟ → Status code چیست؟
- آیا **POST** request وجود دارد؟ → Status code چیست؟
- اگر request fail شده → Error message چیست؟ (مثلاً `net::ERR_FAILED`)

**Console Tab:**
- آیا CORS error وجود دارد؟ → متن دقیق error چیست؟
- مثال: `Access to fetch at 'http://localhost:3001/tts' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Backend Console:**
- آیا `[TTS] hit` چاپ شد؟ → yes/no

---

### Test 2: Speed Changed Playback

1. **Network tab را clear کن** (اگر نیاز است)
2. **Backend console را clear کن** (Ctrl+L)
3. **Speed slider را تغییر بده** (drag و release)
4. **دکمه "Hear AI" را بزن** (یا اگر auto-play است، فقط speed را تغییر بده)
5. **صبر کن** تا request کامل شود (5-10 ثانیه)

**جمع‌آوری Evidence:**

**Network Tab:**
- آیا **OPTIONS** request وجود دارد؟ → Status code چیست؟
- آیا **POST** request وجود دارد؟ → Status code چیست؟
- اگر request fail شده → Error message چیست؟

**Console Tab:**
- آیا CORS error وجود دارد؟ → متن دقیق error چیست؟

**Backend Console:**
- آیا `[TTS] hit` چاپ شد؟ → yes/no

---

## Data Collection Template

### Normal Playback

```
OPTIONS Request:
- Seen: yes/no
- Status: 204/200/404/500/failed/N/A
- Error (if failed): <exact error message>

POST Request:
- Seen: yes/no
- Status: 200/404/500/failed/N/A
- Error (if failed): <exact error message>

Console Errors:
- CORS error: yes/no
- Error message: <exact text or "none">

Backend Console:
- [TTS] hit seen: yes/no
```

### Speed Changed Playback

```
OPTIONS Request:
- Seen: yes/no
- Status: 204/200/404/500/failed/N/A
- Error (if failed): <exact error message>

POST Request:
- Seen: yes/no
- Status: 200/404/500/failed/N/A
- Error (if failed): <exact error message>

Console Errors:
- CORS error: yes/no
- Error message: <exact text or "none">

Backend Console:
- [TTS] hit seen: yes/no
```

---

## Output Format

بعد از جمع‌آوری همه evidence، خروجی را در این فرمت بده:

```
PHASE1_TEST_RESULT:
- Normal: {OPTIONS_status: <value>, POST_status: <value>, any_console_error: <yes/no + details>, backend_hit_seen: yes/no}
- SpeedChanged: {OPTIONS_status: <value>, POST_status: <value>, any_console_error: <yes/no + details>, backend_hit_seen: yes/no}
```

---

## PASS Criteria

✅ **Phase 1 PASS اگر:**
- OPTIONS_status = 204 یا 200
- POST_status ≠ failed (یا ERR_FAILED)
- backend_hit_seen = true (حداقل یک بار)

❌ **Phase 1 FAIL اگر:**
- OPTIONS_status = failed یا ERR_FAILED
- POST_status = failed یا ERR_FAILED
- backend_hit_seen = false (هیچ وقت `[TTS] hit` دیده نشد)

---

## Troubleshooting

**اگر OPTIONS fail شد:**
- CORS config را در backend بررسی کن
- مطمئن شو که `optionsSuccessStatus: 204` تنظیم شده
- Origin frontend را در CORS config بررسی کن

**اگر POST fail شد:**
- Network tab → Request details → Headers را بررسی کن
- Console errors را بررسی کن
- Backend console → آیا error log وجود دارد؟

**اگر `[TTS] hit` دیده نشد:**
- مطمئن شو که backend restart شده (تغییرات Phase 1 اعمال شده)
- مطمئن شو که `NODE_ENV !== 'production'`
- Backend console را بررسی کن

---

## Notes

- اگر POST request اصلاً ارسال نمی‌شود → احتمالاً OPTIONS fail شده
- اگر POST 200 است اما `[TTS] hit` نیست → ممکن است request به route دیگری رفته
- اگر CORS error هست → باید CORS config را بررسی کنی

