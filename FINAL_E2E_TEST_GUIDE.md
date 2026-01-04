# Final E2E Test Guide - Complete Testing Framework

## هدف
تست نهایی کامل که اگر پاس شد، دیگر برنگردیم به این بخش.

---

## پیش‌نیاز: Phase 0-4 باید PASS باشند

قبل از اجرای Final E2E Test، مطمئن شو که:
- ✅ Phase 0: Baseline captured
- ✅ Phase 1: CORS working (OPTIONS 204, POST reaches backend)
- ✅ Phase 2: Response contract standardized (ok, audioBase64, mimeType)
- ✅ Phase 3: Speed change doesn't trigger /tts
- ✅ Phase 4: Buffering state machine working (no hang in 0/1)

---

## Setup

### 1. آماده‌سازی Environment
```bash
# Terminal 1: Backend
cd backend
npm run dev
# باید روی localhost:3001 اجرا شود

# Terminal 2: Frontend
npm run dev
# باید روی localhost:3000 اجرا شود
```

### 2. باز کردن Chrome DevTools
- `F12` بزن
- **Network** tab → Filter: `tts` → Preserve log: ON
- **Console** tab → آماده برای paste کردن اسکریپت

### 3. Load Test Script
- در Console tab، محتوای `FINAL_E2E_TEST_SCRIPT.js` را paste کن
- Enter بزن
- باید پیام "✅ E2E Test Framework loaded!" را ببینی

---

## Test 1: Rapid Fire

### هدف
تست کردن که rapid clicks باعث overlap یا memory leak نمی‌شود.

### دستورالعمل

1. **شروع تست:**
   ```javascript
   testRapidFire()
   ```

2. **اجرای تست:**
   - روی دکمه **"Hear AI"** 10 بار سریع کلیک کن
   - بین هر کلیک کمتر از 1 ثانیه فاصله بگذار
   - بعد از آخرین کلیک، 5 ثانیه صبر کن

3. **پایان تست:**
   ```javascript
   finishRapidFireTest()
   ```

### انتظارات

✅ **PASS Criteria:**
- هر کلیک صدای قبلی را stop می‌کند و جدید را پخش می‌کند
- هیچ error در console نیست
- تعداد POST /tts requests ≈ 10 (یا بیشتر اگر retry باشد)
- Active blob URLs < 5 (no memory leak)
- State transitions منطقی هستند

❌ **FAIL Indicators:**
- Audio overlap (چند صدا همزمان)
- Console errors
- Memory leak (blob URLs > 10)
- UI freeze

### Evidence Collection

اسکریپت خودکار جمع می‌کند:
- تعداد POST /tts requests
- تعداد console errors
- تعداد active blob URLs
- State transitions

---

## Test 2: Speed Torture

### هدف
تست کردن که speed change باعث درخواست اضافی /tts نمی‌شود و playback ادامه می‌یابد.

### دستورالعمل

1. **شروع تست:**
   ```javascript
   testSpeedTorture()
   ```

2. **اجرای تست:**
   - دکمه **"Hear AI"** را بزن (playback شروع شود)
   - **در حین پخش**، speed slider را 20 بار تغییر بده (بالا/پایین)
   - هر تغییر باید کمتر از 1 ثانیه باشد
   - صبر کن تا playback تمام شود

3. **پایان تست:**
   ```javascript
   finishSpeedTortureTest()
   ```

### انتظارات

✅ **PASS Criteria:**
- هیچ POST /tts جدیدی در حین speed changes نیست
- Playback قطع نمی‌شود (یا اگر قطع شد، خودش recover می‌کند)
- playbackRate درست تغییر می‌کند (15-20 تغییر ثبت شده)
- همه playbackRate values در range 0.5-2.0 هستند

❌ **FAIL Indicators:**
- POST /tts requests در حین speed changes
- Playback قطع می‌شود و recover نمی‌شود
- playbackRate تغییر نمی‌کند
- Invalid playbackRate values

### Evidence Collection

اسکریپت خودکار جمع می‌کند:
- تعداد POST /tts requests قبل و بعد از speed changes
- تعداد playbackRate changes
- لیست playbackRate values
- State transitions

---

## Test 3: Offline/Backend Down

### هدف
تست کردن error handling و recovery.

### دستورالعمل

1. **شروع تست:**
   ```javascript
   testOffline()
   ```

2. **اجرای تست:**
   - **Backend را stop کن** (Ctrl+C در terminal backend)
   - دکمه **"Hear AI"** را بزن
   - 10 ثانیه صبر کن
   - **UI را بررسی کن:**
     - آیا error message نمایش داده می‌شود؟
     - آیا از buffering خارج شده است؟
     - آیا UI قفل شده است؟
     - آیا دکمه‌ها قابل کلیک هستند؟
   - **Backend را restart کن** (npm run dev در terminal backend)
   - دوباره **"Hear AI"** را بزن
   - بررسی کن که playback کار می‌کند

3. **پایان تست:**
   ```javascript
   finishOfflineTest()
   ```

### انتظارات

✅ **PASS Criteria:**
- UI پیام error واضح نمایش می‌دهد
- از buffering state خارج می‌شود (نه "Buffering 0/1" stuck)
- برنامه قفل نمی‌شود (buttons clickable)
- بعد از restart backend، playback دوباره کار می‌کند
- State transition به 'error' انجام می‌شود

❌ **FAIL Indicators:**
- UI در "Buffering 0/1" گیر می‌کند
- هیچ error message نمایش داده نمی‌شود
- UI قفل می‌شود (buttons not clickable)
- بعد از restart، playback کار نمی‌کند

### Evidence Collection

اسکریپت خودکار جمع می‌کند:
- تعداد console errors
- State transitions به 'error'
- Network errors

**Manual Checks (باید خودت بررسی کنی):**
- Error message visibility
- UI responsiveness
- Button clickability
- Recovery after restart

---

## Test 4: Long Text

### هدف
تست کردن chunking و UI responsiveness برای متن‌های بلند.

### دستورالعمل

1. **آماده‌سازی متن:**
   - یک متن حداقل 2000 کاراکتر آماده کن
   - می‌توانی از Lorem Ipsum استفاده کنی یا یک متن واقعی

2. **شروع تست:**
   ```javascript
   testLongText()
   ```

3. **اجرای تست:**
   - متن را در app paste کن
   - دکمه **"Hear AI"** را بزن
   - **در حین playback:**
     - بررسی کن که UI responsive است (می‌توانی scroll کنی، buttons کلیک کنی)
     - بررسی کن که NEXT button enabled/disabled درست است
     - بررسی کن که progress indicator کار می‌کند
   - صبر کن تا playback تمام شود
   - بررسی کن که همه chunks پخش شدند

4. **پایان تست:**
   ```javascript
   finishLongTextTest()
   ```

### انتظارات

✅ **PASS Criteria:**
- Chunking کار می‌کند (multiple requests یا session)
- UI responsive می‌ماند (no freeze)
- NEXT button enabled/disabled منطقی است
- همه chunks پخش می‌شوند
- Progress indicator کار می‌کند

❌ **FAIL Indicators:**
- No chunking (only 1 request)
- UI freeze (not responsive)
- NEXT button logic incorrect
- Chunks missing (not all played)

### Evidence Collection

اسکریپت خودکار جمع می‌کند:
- تعداد POST /tts requests
- تعداد POST /tts/session requests
- State transitions

**Manual Checks (باید خودت بررسی کنی):**
- UI responsiveness
- NEXT button state
- Progress indicator
- All chunks played

---

## Generating Final Report

بعد از اجرای همه تست‌ها:

```javascript
generateFinalReport()
```

این دستور:
- همه نتایج را تحلیل می‌کند
- Evidence را جمع می‌کند
- Final report را در فرمت خواسته‌شده تولید می‌کند
- Report را به clipboard کپی می‌کند

---

## Output Format

```
FINAL_E2E_RESULT:
- RapidFire: PASS/FAIL + evidence: <detailed evidence>
- SpeedTorture: PASS/FAIL + evidence: <detailed evidence>
- Offline: PASS/FAIL + evidence: <detailed evidence>
- LongText: PASS/FAIL + evidence: <detailed evidence>
- KnownRemainingIssues: <list of issues or "None">
- Conclusion: "Ready to move on" / "Not ready - issues remain"
```

---

## Troubleshooting

### اگر اسکریپت کار نمی‌کند:
- مطمئن شو که در Console tab هستی
- مطمئن شو که تمام اسکریپت را paste کرده‌ای
- صفحه را refresh کن و دوباره امتحان کن

### اگر تست fail می‌شود:
- `viewTestData()` را بزن تا تمام داده‌ها را ببینی
- Console errors را بررسی کن
- Network tab را برای failed requests بررسی کن
- State transitions را در console بررسی کن

### اگر memory leak مشکوک است:
- `viewTestData()` → `Active Blob URLs` را بررسی کن
- اگر تعداد blob URLs زیاد است، ممکن است memory leak باشد
- بررسی کن که `URL.revokeObjectURL()` صدا می‌شود

---

## Checklist

قبل از Final Report:

- [ ] Test 1 (Rapid Fire) اجرا شده و finish شده
- [ ] Test 2 (Speed Torture) اجرا شده و finish شده
- [ ] Test 3 (Offline) اجرا شده و finish شده
- [ ] Test 4 (Long Text) اجرا شده و finish شده
- [ ] همه manual checks انجام شده
- [ ] Final report تولید شده
- [ ] Evidence برای هر تست جمع شده

---

## Success Criteria

**Ready to move on اگر:**
- ✅ همه 4 تست PASS هستند
- ✅ هیچ known issue باقی نمانده
- ✅ Evidence برای همه تست‌ها موجود است
- ✅ Manual checks همه OK هستند

**Not ready اگر:**
- ❌ هر تستی FAIL است
- ❌ Known issues باقی مانده
- ❌ Evidence ناقص است
- ❌ Manual checks fail هستند

