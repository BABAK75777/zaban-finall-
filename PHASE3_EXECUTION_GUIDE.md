# Phase 3: Speed Control Without Extra TTS Test

## هدف
بررسی اینکه speed change باعث درخواست اضافی `/tts` نمی‌شود و فقط `playbackRate` تغییر می‌کند.

---

## Prerequisites

✅ Phase 2 باید PASS باشد  
✅ Frontend و Backend باید running باشند  
✅ Frontend باید تغییرات Phase 3 را داشته باشد (speed change بدون TTS request)

---

## Setup

### 1. Chrome DevTools
- **Network tab** را باز کن
- **Preserve log**: ✅ ON
- **Filter**: `tts`

### 2. Frontend Console
- Chrome DevTools → **Console tab**
- آماده باش برای دیدن playbackRate logs

---

## Test Execution

### Step 1: Start Playback

1. **Network tab را clear کن** (اگر نیاز است)
2. **Console tab را clear کن**
3. **دکمه "Hear AI" را بزن** (با متن معتبر)
4. **صبر کن** تا audio شروع به پخش شود
5. **تعداد POST /tts requests را یادداشت کن** (baseline count)

**Baseline Count:**
- POST /tts requests قبل از speed changes: _______________

---

### Step 2: Change Speed Multiple Times

**در حین پخش** (audio باید در حال پخش باشد):

1. **Speed slider را تغییر بده** (مثلاً 0.8)
   - Console را بررسی کن: آیا playbackRate log وجود دارد؟
   - Network tab را بررسی کن: آیا POST /tts جدیدی اضافه شد؟

2. **Speed slider را دوباره تغییر بده** (مثلاً 1.2)
   - Console را بررسی کن
   - Network tab را بررسی کن

3. **Speed slider را دوباره تغییر بده** (مثلاً 1.5)
   - Console را بررسی کن
   - Network tab را بررسی کن

4. **Speed slider را چند بار دیگر تغییر بده** (حداقل 5-7 بار تغییر)
   - هر بار Console و Network را بررسی کن

**Total Speed Changes:** _______________ (حداقل 5 بار)

---

### Step 3: Collect Evidence

**Network Tab:**

1. **Filter: `tts`** را نگه دار
2. **POST requests را بشمار:**
   - تعداد کل POST /tts requests: _______________
   - Baseline count (قبل از speed changes): _______________
   - **New POST /tts during speed changes:** _______________

**Critical Check:**
- آیا POST /tts جدیدی در حین speed changes اضافه شد؟
- اگر بله → FAIL (نباید اضافه شود)
- اگر خیر → PASS ✅

---

**Console Tab:**

1. **PlaybackRate logs را پیدا کن:**
   - Search: `playbackRate` یا `[AiAudioPlayer]`
   - تمام playbackRate values را یادداشت کن

**PlaybackRate Values Observed:**
- [ ] Value 1: _______________
- [ ] Value 2: _______________
- [ ] Value 3: _______________
- [ ] Value 4: _______________
- [ ] Value 5: _______________
- [ ] ... (همه values را یادداشت کن)

**List Format:** `[1.0, 0.8, 1.2, 1.5, ...]`

---

**Errors:**

- [ ] Console errors: yes / no
- Error details: _______________

---

## Data Collection Template

### Network Evidence

```
Baseline (before speed changes):
- POST /tts requests: _______________

During Speed Changes:
- New POST /tts requests: _______________
- Expected: 0
```

### Console Evidence

```
PlaybackRate Changes:
- Values observed: [_______________, _______________, _______________, ...]
- Total changes: _______________
```

### Errors

```
Console Errors:
- Present: yes / no
- Details: _______________
```

---

## Output Format

بعد از جمع‌آوری evidence، خروجی را در این فرمت بده:

```
PHASE3_TEST_RESULT:
- Network_TTS_calls_during_speed_change: <number>
- playbackRate_values_observed: [value1, value2, value3, ...]
- any_errors: <none or exact error message>
```

### Example:

```
PHASE3_TEST_RESULT:
- Network_TTS_calls_during_speed_change: 0
- playbackRate_values_observed: [1.0, 0.8, 1.2, 1.5, 0.9, 1.3]
- any_errors: none
```

---

## PASS Criteria

✅ **Phase 3 PASS اگر:**

- `Network_TTS_calls_during_speed_change = 0` (هیچ POST /tts جدیدی در حین speed changes)
- `playbackRate_values_observed` شامل حداقل 3 مقدار متفاوت
- `any_errors = none` (یا error غیرمرتبط با speed)

❌ **Phase 3 FAIL اگر:**

- `Network_TTS_calls_during_speed_change > 0` (POST /tts جدید در حین speed changes)
- `playbackRate_values_observed` کمتر از 3 مقدار
- `any_errors` شامل error مرتبط با speed change

---

## Troubleshooting

**اگر POST /tts جدید اضافه شد:**

- بررسی کن که آیا `triggerTestPlayback()` در `finalizeSpeedChange()` حذف شده
- بررسی کن که `handleSpeedChange()` فقط `setPlaybackRate()` را صدا می‌زند
- Network tab → Request details → Headers را بررسی کن

**اگر playbackRate تغییر نمی‌کند:**

- Console → آیا `[AiAudioPlayer]` logs وجود دارد؟
- بررسی کن که `aiAudioPlayer.setPlaybackRate()` صدا می‌شود
- بررسی کن که audio element موجود است

**اگر error وجود دارد:**

- Console error را بررسی کن
- آیا error مرتبط با speed change است؟
- آیا error باعث fail شدن playback می‌شود؟

---

## Notes

- **Critical:** باید در حین پخش speed را تغییر بدهی (audio باید playing باشد)
- **Important:** حداقل 5-7 بار speed را تغییر بده تا مطمئن شوی
- **Check:** Network tab را real-time بررسی کن (نه بعد از تمام شدن)
- **Verify:** playbackRate values باید در range 0.5-2.0 باشند

---

## Helper Console Commands (Optional)

اگر می‌خواهی playbackRate را manual check کنی:

```javascript
// در Console:
aiAudioPlayer.getPlaybackRate() // Current playback rate
```

---

## Expected Behavior

1. **Audio starts playing** → baseline POST /tts request
2. **Speed slider changed** → NO new POST /tts, playbackRate changes
3. **Speed slider changed again** → NO new POST /tts, playbackRate changes
4. **Audio continues playing** → با speed جدید
5. **No errors** → همه چیز smooth است

