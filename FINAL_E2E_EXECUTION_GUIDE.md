# Final E2E Test - Execution Guide

## Prerequisites

✅ **Phase 0-4 باید همه PASS باشند**

---

## Setup

### 1. Chrome DevTools
- **Console tab** را باز کن
- **Network tab** را باز کن (optional, برای monitoring)

### 2. Backend Console
- Terminal که backend را اجرا می‌کند را باز کن

### 3. Frontend
- http://localhost:3000 را باز کن

---

## Execution Steps

### Step 1: Load Test Script

1. **Console tab** را باز کن
2. فایل `FINAL_E2E_TEST_SCRIPT.js` را باز کن
3. **تمام محتوا** را copy کن
4. در Console tab **paste** کن
5. **Enter** بزن
6. باید پیام ببینی: "✅ E2E Test Framework loaded!"

---

### Step 2: Test 1 - Rapid Fire

**Execute:**
```javascript
testRapidFire()
```

**Action:**
- روی دکمه **"Hear AI"** 10 بار سریع کلیک کن
- بین هر کلیک کمتر از 1 ثانیه فاصله بگذار
- بعد از آخرین کلیک، 5 ثانیه صبر کن

**Finish:**
```javascript
finishRapidFireTest()
```

**Collect:**
- Console output را copy کن
- نتایج: `POST /tts requests`, `errors`, `blob URLs`

---

### Step 3: Test 2 - Speed Torture

**Execute:**
```javascript
testSpeedTorture()
```

**Action:**
- دکمه **"Hear AI"** را بزن (playback شروع شود)
- **در حین پخش**، speed slider را 20 بار تغییر بده (بالا/پایین)
- هر تغییر باید کمتر از 1 ثانیه باشد
- صبر کن تا playback تمام شود

**Finish:**
```javascript
finishSpeedTortureTest()
```

**Collect:**
- Console output را copy کن
- نتایج: `New POST /tts`, `rate changes`, `errors`

---

### Step 4: Test 3 - Offline

**Execute:**
```javascript
testOffline()
```

**Action:**
- **Backend را stop کن** (Ctrl+C در terminal backend)
- دکمه **"Hear AI"** را بزن
- 10 ثانیه صبر کن
- **UI را بررسی کن:**
  - Error message نمایش داده می‌شود؟
  - از buffering خارج شده است؟
  - UI frozen نیست؟
  - Buttons clickable هستند؟
- **Backend را restart کن** (npm run dev)
- دوباره **"Hear AI"** را بزن
- بررسی کن که playback کار می‌کند

**Finish:**
```javascript
finishOfflineTest()
```

**Collect:**
- Console output را copy کن
- Manual checks: `error message`, `no hang`, `recovery works`

---

### Step 5: Test 4 - Long Text

**Execute:**
```javascript
testLongText()
```

**Action:**
- فایل `LONG_TEXT_SAMPLE.txt` را باز کن
- **تمام متن** را copy کن
- در app **paste** کن
- دکمه **"Hear AI"** را بزن
- **در حین playback:**
  - UI responsive است؟ (می‌توانی scroll کنی، buttons کلیک کنی)
  - NEXT button enabled/disabled درست است؟
  - Progress indicator کار می‌کند؟
- صبر کن تا playback تمام شود

**Finish:**
```javascript
finishLongTextTest()
```

**Collect:**
- Console output را copy کن
- Manual checks: `responsive`, `chunking`, `next logic`

---

### Step 6: Generate Final Report

**Execute:**
```javascript
generateFinalReport()
```

**Output:**
- Report در console چاپ می‌شود
- Report به clipboard کپی می‌شود
- **تمام output را copy کن**

---

## Output Format

خروجی باید دقیقاً در این فرمت باشد:

```
FINAL_E2E_RESULT:
- RapidFire: PASS/FAIL + evidence (counts: tts posts, errors, blob urls)
- SpeedTorture: PASS/FAIL + evidence (tts posts during speed, rate changes, errors)
- Offline: PASS/FAIL + evidence (ui message, no hang, recovery works)
- LongText: PASS/FAIL + evidence (responsive, chunking, next logic)
- KnownRemainingIssues: None OR exact list
- Conclusion: Ready to move on / Not ready
```

---

## Critical Rules

1. **اگر هر تستی FAIL شد:**
   - **STOP کن**
   - فقط evidence آن FAIL را بده
   - تست‌های بعدی را اجرا نکن

2. **Evidence باید دقیق باشد:**
   - اعداد (counts)
   - Status (PASS/FAIL)
   - متن دقیق errors
   - Manual checks (yes/no)

3. **هیچ توضیح کلی نده:**
   - فقط نتایج
   - فقط اعداد
   - فقط status

---

## Troubleshooting

**اگر script load نشد:**
- مطمئن شو که تمام script را copy کرده‌ای
- Console errors را بررسی کن
- صفحه را refresh کن و دوباره امتحان کن

**اگر تست fail شد:**
- `viewTestData()` را بزن تا تمام داده‌ها را ببینی
- Console errors را بررسی کن
- Network tab → failed requests را بررسی کن

**اگر report generate نشد:**
- مطمئن شو که همه تست‌ها finish شده‌اند
- `viewTestData()` را بزن تا ببینی چه داده‌هایی جمع شده

---

## Expected Evidence Format

### RapidFire
```
PASS + evidence: POST /tts: 10, errors: 0, blob URLs: 2
```
یا
```
FAIL + evidence: POST /tts: 8, errors: 2 (CORS error, Network error), blob URLs: 15
```

### SpeedTorture
```
PASS + evidence: New /tts: 0, rate changes: 18, errors: none
```
یا
```
FAIL + evidence: New /tts: 3, rate changes: 5, errors: playbackRate error
```

### Offline
```
PASS + evidence: Error message: yes, no hang: yes, recovery: yes
```
یا
```
FAIL + evidence: Error message: no, no hang: no (UI frozen), recovery: N/A
```

### LongText
```
PASS + evidence: Responsive: yes, chunking: 3 chunks, next logic: correct
```
یا
```
FAIL + evidence: Responsive: no (UI freeze), chunking: 1 chunk, next logic: incorrect
```

---

## Notes

- **Critical:** اگر هر تستی FAIL شد، STOP کن
- **Important:** Evidence باید دقیق و با اعداد باشد
- **Check:** Manual checks را فراموش نکن (UI observation)

