# Phase 3: Data Collection Template

## Copy this template and fill it with your observations

---

## Step 1: Baseline Count

**Before Speed Changes:**
- [ ] Audio playback started: yes / no
- POST /tts requests (baseline): _______________
- Timestamp: _______________

---

## Step 2: Speed Changes (During Playback)

**Speed Change 1:**
- [ ] Speed value: _______________
- [ ] New POST /tts: yes / no
- [ ] PlaybackRate log in console: yes / no
- [ ] PlaybackRate value: _______________

**Speed Change 2:**
- [ ] Speed value: _______________
- [ ] New POST /tts: yes / no
- [ ] PlaybackRate log in console: yes / no
- [ ] PlaybackRate value: _______________

**Speed Change 3:**
- [ ] Speed value: _______________
- [ ] New POST /tts: yes / no
- [ ] PlaybackRate log in console: yes / no
- [ ] PlaybackRate value: _______________

**Speed Change 4:**
- [ ] Speed value: _______________
- [ ] New POST /tts: yes / no
- [ ] PlaybackRate log in console: yes / no
- [ ] PlaybackRate value: _______________

**Speed Change 5:**
- [ ] Speed value: _______________
- [ ] New POST /tts: yes / no
- [ ] PlaybackRate log in console: yes / no
- [ ] PlaybackRate value: _______________

**Speed Change 6+ (if any):**
- [ ] Speed value: _______________
- [ ] New POST /tts: yes / no
- [ ] PlaybackRate value: _______________

---

## Step 3: Final Count

**After All Speed Changes:**
- Total POST /tts requests: _______________
- Baseline count: _______________
- **New POST /tts during speed changes:** _______________

---

## Console Evidence

**PlaybackRate Values Observed:**
- [ ] Value 1: _______________
- [ ] Value 2: _______________
- [ ] Value 3: _______________
- [ ] Value 4: _______________
- [ ] Value 5: _______________
- [ ] Value 6: _______________
- [ ] ... (add more if needed)

**List Format:** `[_______________, _______________, _______________, ...]`

**Total Unique Values:** _______________

---

## Errors

- [ ] Console errors: yes / no
- Error count: _______________
- Error details: _______________

---

## Final Output

After filling the template above, format your output as:

```
PHASE3_TEST_RESULT:
- Network_TTS_calls_during_speed_change: <number>
- playbackRate_values_observed: [value1, value2, value3, ...]
- any_errors: <none or exact error message>
```

### Example Output:

```
PHASE3_TEST_RESULT:
- Network_TTS_calls_during_speed_change: 0
- playbackRate_values_observed: [1.0, 0.8, 1.2, 1.5, 0.9, 1.3]
- any_errors: none
```

---

## Critical Checks

✅ **Network:**
- New POST /tts during speed changes must be 0
- Baseline count should be 1 (initial playback)

✅ **PlaybackRate:**
- At least 3 different values observed
- Values should be in range 0.5-2.0
- Values should match speed slider values

✅ **Errors:**
- No errors related to speed change
- Playback should continue smoothly

---

## Screenshots (Optional but Recommended)

If possible, take screenshots of:
1. Network tab showing POST /tts requests (before and after speed changes)
2. Console showing playbackRate logs
3. Speed slider positions during test

