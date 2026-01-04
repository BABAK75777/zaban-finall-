# Final E2E Test - Step by Step Execution

## ⚠️ Important Note

این تست نیاز به اجرای دستی در browser دارد. من نمی‌توانم مستقیماً browser را کنترل کنم، اما این راهنمای دقیق را برای اجرا آماده کرده‌ام.

---

## Step 1: Load Script

1. Chrome را باز کن → http://localhost:3000
2. **F12** بزن (DevTools)
3. **Console tab** را انتخاب کن
4. فایل `FINAL_E2E_TEST_SCRIPT.js` را باز کن
5. **تمام محتوا** را select کن (Ctrl+A)
6. **Copy** کن (Ctrl+C)
7. در Console tab **Paste** کن (Ctrl+V)
8. **Enter** بزن
9. باید ببینی: `✅ E2E Test Framework loaded!`

---

## Step 2: Test 1 - Rapid Fire

**در Console:**
```javascript
testRapidFire()
```

**در UI:**
- روی دکمه **"Hear AI"** 10 بار سریع کلیک کن
- بین هر کلیک کمتر از 1 ثانیه فاصله بگذار
- بعد از آخرین کلیک، 5 ثانیه صبر کن

**در Console:**
```javascript
finishRapidFireTest()
```

**خروجی را copy کن** (console output)

---

## Step 3: Test 2 - Speed Torture

**در Console:**
```javascript
testSpeedTorture()
```

**در UI:**
- دکمه **"Hear AI"** را بزن (playback شروع شود)
- **در حین پخش**، speed slider را 20 بار تغییر بده (بالا/پایین)
- هر تغییر باید کمتر از 1 ثانیه باشد
- صبر کن تا playback تمام شود

**در Console:**
```javascript
finishSpeedTortureTest()
```

**خروجی را copy کن**

---

## Step 4: Test 3 - Offline

**در Console:**
```javascript
testOffline()
```

**در Terminal (Backend):**
- **Ctrl+C** بزن (backend را stop کن)

**در UI:**
- دکمه **"Hear AI"** را بزن
- 10 ثانیه صبر کن
- **بررسی کن:**
  - Error message نمایش داده می‌شود؟ yes/no
  - UI frozen نیست؟ yes/no
  - Buttons clickable هستند؟ yes/no

**در Terminal (Backend):**
- Backend را restart کن: `npm run dev`

**در UI:**
- دوباره **"Hear AI"** را بزن
- بررسی کن که playback کار می‌کند: yes/no

**در Console:**
```javascript
finishOfflineTest()
```

**خروجی را copy کن**

---

## Step 5: Test 4 - Long Text

**در Console:**
```javascript
testLongText()
```

**در UI:**
- فایل `LONG_TEXT_SAMPLE.txt` را باز کن
- **تمام متن** را copy کن
- در app **paste** کن
- دکمه **"Hear AI"** را بزن
- **در حین playback:**
  - UI responsive است؟ (می‌توانی scroll کنی) yes/no
  - NEXT button enabled/disabled درست است؟ yes/no
  - Progress indicator کار می‌کند؟ yes/no
- صبر کن تا playback تمام شود

**در Console:**
```javascript
finishLongTextTest()
```

**خروجی را copy کن**

---

## Step 6: Generate Final Report

**در Console:**
```javascript
generateFinalReport()
```

**خروجی:**
- Report در console چاپ می‌شود
- Report به clipboard کپی می‌شود
- **تمام output را copy کن**

---

## Output Format

خروجی باید دقیقاً در این فرمت باشد:

```
FINAL_E2E_RESULT:
- RapidFire: PASS/FAIL + evidence (counts: tts posts: <number>, errors: <number>, blob urls: <number>)
- SpeedTorture: PASS/FAIL + evidence (tts posts during speed: <number>, rate changes: <number>, errors: <none or exact>)
- Offline: PASS/FAIL + evidence (ui message: <yes/no>, no hang: <yes/no>, recovery works: <yes/no>)
- LongText: PASS/FAIL + evidence (responsive: <yes/no>, chunking: <details>, next logic: <correct/incorrect>)
- KnownRemainingIssues: None OR <exact list>
- Conclusion: Ready to move on / Not ready
```

---

## اگر مشکلی پیش آمد

**اگر script load نشد:**
- مطمئن شو که تمام script را copy کرده‌ای
- Console errors را بررسی کن
- صفحه را refresh کن و دوباره امتحان کن

**اگر تست fail شد:**
- `viewTestData()` را بزن تا تمام داده‌ها را ببینی
- Console errors را بررسی کن
- **STOP کن** و فقط evidence آن FAIL را بده

**اگر report generate نشد:**
- مطمئن شو که همه تست‌ها finish شده‌اند
- `viewTestData()` را بزن

---

## بعد از اجرا

**تمام خروجی `generateFinalReport()` را copy کن و اینجا paste کن.**

اگر هر تستی FAIL شد، **STOP کن** و فقط evidence آن را بده.

