# Final E2E Test - Quick Start Guide

## هدف
تست نهایی کامل که اگر پاس شد، دیگر برنگردیم به این بخش.

---

## Quick Start (5 دقیقه)

### 1. Setup
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
npm run dev
```

### 2. Load Test Script
- Chrome DevTools (F12) → Console tab
- Paste `FINAL_E2E_TEST_SCRIPT.js` → Enter

### 3. Run Tests (ترتیب مهم است)

```javascript
// Test 1: Rapid Fire
testRapidFire()
// → Click "Hear AI" 10 times rapidly
// → Wait 5 seconds
finishRapidFireTest()

// Test 2: Speed Torture
testSpeedTorture()
// → Start playback
// → Change speed 20 times while playing
// → Wait for completion
finishSpeedTortureTest()

// Test 3: Offline
testOffline()
// → Stop backend
// → Click "Hear AI"
// → Check UI
// → Restart backend
// → Click "Hear AI" again
finishOfflineTest()

// Test 4: Long Text
testLongText()
// → Paste 2000+ char text (use LONG_TEXT_SAMPLE.txt)
// → Click "Hear AI"
// → Observe chunking and UI
finishLongTextTest()

// Generate Report
generateFinalReport()
```

---

## Expected Results

### Test 1: Rapid Fire
- ✅ 10 POST /tts requests (or more if retries)
- ✅ 0 console errors
- ✅ < 5 active blob URLs (no memory leak)
- ✅ Each click stops previous and starts new

### Test 2: Speed Torture
- ✅ 0 new POST /tts during speed changes
- ✅ 15-20 playbackRate changes recorded
- ✅ All playbackRate values in 0.5-2.0 range
- ✅ Playback continues (no interruption)

### Test 3: Offline
- ✅ Error message shown
- ✅ Exited buffering state
- ✅ UI not frozen
- ✅ Playback works after restart

### Test 4: Long Text
- ✅ Multiple POST /tts or POST /tts/session requests
- ✅ UI remains responsive
- ✅ NEXT button logic correct
- ✅ All chunks played

---

## Output Format

```
FINAL_E2E_RESULT:
- RapidFire: PASS + evidence: POST /tts: 10, errors: 0, blob URLs: 2
- SpeedTorture: PASS + evidence: New /tts: 0, rate changes: 18, all valid
- Offline: PASS + evidence: Error shown, exited buffering, UI responsive
- LongText: PASS + evidence: 3 chunks, UI responsive, NEXT correct
- KnownRemainingIssues: None
- Conclusion: Ready to move on
```

---

## Troubleshooting

**اگر تست fail شد:**
1. `viewTestData()` بزن → تمام داده‌ها را ببین
2. Console errors را بررسی کن
3. Network tab را برای failed requests بررسی کن
4. Phase مربوطه را دوباره تست کن

**اگر memory leak مشکوک است:**
- `viewTestData()` → `Active Blob URLs` را بررسی کن
- باید < 5 باشد بعد از cleanup

**اگر speed change باعث /tts می‌شود:**
- Phase 3 را دوباره بررسی کن
- مطمئن شو که `triggerTestPlayback()` حذف شده

---

## Success Criteria

**Ready to move on اگر:**
- ✅ همه 4 تست PASS
- ✅ Evidence برای همه موجود
- ✅ Known issues: None
- ✅ Manual checks همه OK

**Not ready اگر:**
- ❌ هر تستی FAIL
- ❌ Evidence ناقص
- ❌ Known issues باقی مانده

