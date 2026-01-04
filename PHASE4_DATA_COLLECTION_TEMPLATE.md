# Phase 4: Data Collection Template

## Copy this template and fill it with your observations

---

## Scenario 1: Normal Playback Flow

### Initial State (Before Clicking "Hear AI")

- [ ] Buffering progress: visible / hidden
- Buffering text: _______________
- [ ] NEXT button: enabled / disabled
- [ ] "Hear AI" button text: _______________

### After Clicking "Hear AI" (Initial)

- [ ] Buffering progress: visible / hidden
- Buffering text: _______________ (مثلاً "Buffering 0/1")
- [ ] NEXT button: enabled / disabled
- [ ] "Hear AI" button text: _______________ (Loading... / Connecting... / Buffering...)

### After First Chunk Ready

- [ ] Buffering progress: visible / hidden
- Buffering text: _______________ (مثلاً "Buffering 1/1" یا "Playing 1/1")
- [ ] NEXT button: enabled / disabled
- [ ] "Hear AI" button text: _______________

### After Playback Starts

- [ ] Buffering progress: visible / hidden
- Buffering text: _______________ (hidden / "Playing X/Y")
- [ ] NEXT button: enabled / disabled
- [ ] Audio playing: yes / no

### Console Evidence

- [ ] State transitions observed: yes / no
- Transitions: _______________ (مثلاً `idle → connecting → buffering → playing`)
- `[TTS:Streaming:STATE]` logs: _______________

### Summary

**Buffer Progress:**
- Initial: _______________
- After chunk ready: _______________
- Final: _______________

**NEXT Button:**
- Initial: _______________
- After chunk ready: _______________
- Final: _______________

**Format:** `buffer_progress: "<initial> → <final>", next_enabled: "<initial> → <final>"`

---

## Scenario 2: Error Case

### Initial State (Before Error)

- [ ] Buffering progress: visible / hidden
- Buffering text: _______________
- [ ] NEXT button: enabled / disabled
- [ ] Error message: visible / hidden

### After Clicking "Hear AI" (Before Error)

- [ ] Buffering progress: visible / hidden
- Buffering text: _______________ (مثلاً "Buffering 0/1")
- [ ] NEXT button: enabled / disabled
- [ ] "Hear AI" button text: _______________

### After Error Occurs (10-15 seconds)

- [ ] Buffering progress: visible / hidden
- Buffering text: _______________ (hidden / "Buffering 0/1" stuck?)
- [ ] NEXT button: enabled / disabled
- [ ] Error message: visible / hidden
- Error message text: _______________
- [ ] "Hear AI" button text: _______________

### Critical Checks

- [ ] UI از buffering خارج شد: yes / no
- [ ] Error message نمایش داده می‌شود: yes / no
- [ ] UI frozen نیست (buttons clickable): yes / no
- [ ] NEXT button usable است (enabled): yes / no

### Console Evidence

- [ ] State transitions observed: yes / no
- Transitions: _______________ (مثلاً `buffering → error`)
- `[TTS:Streaming:STATE]` logs: _______________
- Error logs: _______________

### Summary

**Buffer Progress:**
- Initial: _______________
- After error: _______________
- Final: _______________

**Error State:**
- Error visible: yes / no
- Error message: _______________

**UI State:**
- UI not hung: yes / no
- Buttons clickable: yes / no
- NEXT usable: yes / no

**Format:** `buffer_progress: "<initial> → <after_error>", error_visible: yes/no, ui_not_hung: yes/no, next_usable: yes/no`

---

## Final Output

After filling the template above, format your output as:

```
PHASE4_TEST_RESULT:
- Scenario1: {buffer_progress: "<initial> → <final>", next_enabled: "<initial> → <final>"}
- Scenario2: {buffer_progress: "<initial> → <after_error>", error_visible: yes/no, ui_not_hung: yes/no, next_usable: yes/no}
```

### Example Output:

```
PHASE4_TEST_RESULT:
- Scenario1: {buffer_progress: "0/1 → 1/1", next_enabled: "disabled → enabled"}
- Scenario2: {buffer_progress: "0/1 → hidden", error_visible: yes, ui_not_hung: yes, next_usable: yes}
```

---

## Critical Checks

✅ **Scenario 1:**
- Buffer progress باید از "0/1" به "1/1" تغییر کند
- NEXT button باید از disabled به enabled تغییر کند
- State transitions باید منطقی باشند

✅ **Scenario 2:**
- Buffer progress باید از "0/1" خارج شود (نه stuck)
- Error message باید نمایش داده شود
- UI باید NOT hung باشد (critical!)
- NEXT button باید usable باشد (enabled)

❌ **FAIL Indicators:**
- Buffer progress stuck در "0/1"
- Error message نمایش داده نمی‌شود
- UI frozen است (buttons not clickable)
- NEXT button disabled است

---

## Screenshots (Optional but Recommended)

If possible, take screenshots of:
1. UI showing "Buffering 0/1" → "Buffering 1/1" (Scenario 1)
2. UI showing error message (Scenario 2)
3. Console showing state transitions
4. NEXT button states (disabled → enabled)

