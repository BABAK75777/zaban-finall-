# Final E2E Test - Output Template

## Copy this template and fill it with actual results

---

## Test 1: Rapid Fire

**Status:** PASS / FAIL

**Evidence:**
- POST /tts requests: _______________
- Console errors: _______________
- Active blob URLs: _______________

**Output:**
```
RapidFire: PASS/FAIL + evidence (counts: tts posts: <number>, errors: <number>, blob urls: <number>)
```

---

## Test 2: Speed Torture

**Status:** PASS / FAIL

**Evidence:**
- New POST /tts during speed changes: _______________
- Playback rate changes: _______________
- Errors: _______________

**Output:**
```
SpeedTorture: PASS/FAIL + evidence (tts posts during speed: <number>, rate changes: <number>, errors: <none or exact>)
```

---

## Test 3: Offline

**Status:** PASS / FAIL

**Evidence:**
- Error message visible: yes / no
- UI not hung: yes / no
- Recovery works (after restart): yes / no

**Output:**
```
Offline: PASS/FAIL + evidence (ui message: <yes/no>, no hang: <yes/no>, recovery works: <yes/no>)
```

---

## Test 4: Long Text

**Status:** PASS / FAIL

**Evidence:**
- UI responsive: yes / no
- Chunking: _______________ (number of chunks or "no chunking")
- NEXT logic: correct / incorrect

**Output:**
```
LongText: PASS/FAIL + evidence (responsive: <yes/no>, chunking: <details>, next logic: <correct/incorrect>)
```

---

## Known Remaining Issues

- [ ] None
- [ ] Issue 1: _______________
- [ ] Issue 2: _______________
- [ ] ...

**Output:**
```
KnownRemainingIssues: None OR <exact list>
```

---

## Conclusion

- [ ] Ready to move on
- [ ] Not ready

**Output:**
```
Conclusion: Ready to move on / Not ready
```

---

## Final Output Format

بعد از پر کردن template بالا، خروجی نهایی را در این فرمت بده:

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

## Example Output

```
FINAL_E2E_RESULT:
- RapidFire: PASS + evidence (counts: tts posts: 10, errors: 0, blob urls: 2)
- SpeedTorture: PASS + evidence (tts posts during speed: 0, rate changes: 18, errors: none)
- Offline: PASS + evidence (ui message: yes, no hang: yes, recovery works: yes)
- LongText: PASS + evidence (responsive: yes, chunking: 3 chunks, next logic: correct)
- KnownRemainingIssues: None
- Conclusion: Ready to move on
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

