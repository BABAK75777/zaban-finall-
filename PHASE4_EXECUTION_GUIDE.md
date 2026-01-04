# Phase 4: Buffering/Next State Machine Test

## هدف
بررسی اینکه state machine درست کار می‌کند و UI هرگز در "Buffering 0/1" گیر نمی‌کند.

---

## Prerequisites

✅ Phase 3 باید PASS باشد  
✅ Frontend و Backend باید running باشند  
✅ Frontend باید تغییرات Phase 4 را داشته باشد (state machine improvements)

---

## Setup

### 1. Chrome DevTools
- **Network tab** را باز کن
- **Preserve log**: ✅ ON
- **Filter**: `tts`

### 2. Frontend Console
- Chrome DevTools → **Console tab**
- آماده باش برای دیدن state transition logs

### 3. UI Observation
- آماده باش برای مشاهده:
  - Buffering progress indicator
  - NEXT button state (enabled/disabled)
  - Error messages

---

## Test Scenario 1: Normal Playback Flow

### Execution

1. **Network tab را clear کن**
2. **Console tab را clear کن**
3. **UI را مشاهده کن:**
   - NEXT button state: _______________ (enabled/disabled)
   - Buffering indicator: _______________ (visible/hidden)

4. **دکمه "Hear AI" را بزن**

5. **Real-time Observation (در حین request):**

   **Step 1: Initial State**
   - Buffering progress: _______________ (مثلاً "Buffering 0/1")
   - NEXT button: _______________ (enabled/disabled)
   - "Hear AI" button text: _______________ (Loading... / Connecting... / Buffering...)

   **Step 2: After First Chunk Ready**
   - Buffering progress: _______________ (مثلاً "Buffering 1/1" یا "Playing 1/1")
   - NEXT button: _______________ (enabled/disabled)
   - "Hear AI" button text: _______________

   **Step 3: After Playback Starts**
   - Buffering progress: _______________ (hidden / "Playing X/Y")
   - NEXT button: _______________ (enabled/disabled)
   - Audio playing: yes / no

6. **Console Tab:**
   - State transitions: _______________ (مثلاً `idle → connecting → buffering → playing`)
   - `[TTS:Streaming:STATE]` logs: _______________

---

### Evidence Collection for Scenario 1

**Buffer Progress:**
- Initial: _______________ (مثلاً "0/1")
- After chunk ready: _______________ (مثلاً "1/1")
- Final: _______________

**NEXT Button State:**
- Initial: _______________ (enabled/disabled)
- After chunk ready: _______________ (enabled/disabled)
- Final: _______________ (enabled/disabled)

**State Transitions:**
- Observed transitions: _______________

---

## Test Scenario 2: Error Case

### Execution

**Option A: Backend Stop (Recommended)**

1. **Network tab را clear کن**
2. **Console tab را clear کن**
3. **UI را مشاهده کن:**
   - NEXT button state: _______________
   - Error message: _______________ (visible/hidden)

4. **Backend را stop کن** (Ctrl+C در terminal backend)

5. **دکمه "Hear AI" را بزن**

6. **Real-time Observation:**

   **Step 1: Initial State**
   - Buffering progress: _______________ (مثلاً "Buffering 0/1")
   - NEXT button: _______________
   - "Hear AI" button text: _______________

   **Step 2: After Error (10-15 seconds)**
   - Buffering progress: _______________ (hidden / "Buffering 0/1" stuck?)
   - NEXT button: _______________ (enabled/disabled)
   - Error message: _______________ (visible/hidden)
   - Error message text: _______________
   - "Hear AI" button text: _______________

   **Critical Checks:**
   - [ ] UI از buffering خارج شد؟ (نه "Buffering 0/1" stuck)
   - [ ] Error message نمایش داده می‌شود؟
   - [ ] UI frozen نیست؟ (buttons clickable)
   - [ ] NEXT button usable است؟ (enabled)

7. **Console Tab:**
   - State transitions: _______________ (مثلاً `buffering → error`)
   - `[TTS:Streaming:STATE]` logs: _______________
   - Error logs: _______________

8. **Backend را restart کن** (برای تست بعدی)

---

**Option B: Force Error (Alternative)**

اگر می‌خواهی error دیگری تست کنی:
- متن خالی بده → "Hear AI" بزن
- یا شرایط دیگری که error بدهد

---

### Evidence Collection for Scenario 2

**Buffer Progress:**
- Initial: _______________ (مثلاً "Buffering 0/1")
- After error: _______________ (hidden / "Buffering 0/1" stuck?)
- Final: _______________

**Error State:**
- Error visible: yes / no
- Error message: _______________
- Error state duration: _______________ (stuck یا exited quickly?)

**UI State:**
- UI not hung: yes / no
- Buttons clickable: yes / no
- NEXT button usable: yes / no (enabled?)

**State Transitions:**
- Observed transitions: _______________
- Final state: _______________ (error / idle / hung)

---

## Data Collection Template

### Scenario 1: Normal Playback

```
Initial State:
- Buffering: _______________
- NEXT: enabled / disabled

After Chunk Ready:
- Buffering: _______________
- NEXT: enabled / disabled

Final State:
- Buffering: _______________
- NEXT: enabled / disabled
- Audio: playing / idle
```

### Scenario 2: Error Case

```
Initial State:
- Buffering: _______________
- NEXT: enabled / disabled
- Error: visible / hidden

After Error:
- Buffering: _______________ (stuck or exited?)
- NEXT: enabled / disabled
- Error: visible / hidden
- Error message: _______________

UI State:
- UI hung: yes / no
- Buttons clickable: yes / no
- NEXT usable: yes / no
```

---

## Output Format

بعد از جمع‌آوری evidence، خروجی را در این فرمت بده:

```
PHASE4_TEST_RESULT:
- Scenario1: {buffer_progress: "<initial> → <final>", next_enabled: "<initial> → <final>"}
- Scenario2: {buffer_progress: "<initial> → <after_error>", error_visible: yes/no, ui_not_hung: yes/no, next_usable: yes/no}
```

### Example:

```
PHASE4_TEST_RESULT:
- Scenario1: {buffer_progress: "0/1 → 1/1", next_enabled: "disabled → enabled"}
- Scenario2: {buffer_progress: "0/1 → hidden", error_visible: yes, ui_not_hung: yes, next_usable: yes}
```

---

## PASS Criteria

✅ **Phase 4 PASS اگر:**

**Scenario 1:**
- `buffer_progress` = "0/1 → 1/1" (یا مشابه)
- `next_enabled` = "disabled → enabled"
- State transitions منطقی هستند

**Scenario 2:**
- `buffer_progress` = "0/1 → hidden" (یا "0/1 → error") (NOT stuck)
- `error_visible` = yes
- `ui_not_hung` = yes (critical!)
- `next_usable` = yes (NEXT enabled)

❌ **Phase 4 FAIL اگر:**

**Scenario 1:**
- `buffer_progress` stuck در "0/1"
- `next_enabled` = "disabled → disabled" (NEXT enabled نشد)

**Scenario 2:**
- `buffer_progress` = "0/1 → 0/1" (stuck)
- `error_visible` = no
- `ui_not_hung` = no (UI frozen)
- `next_usable` = no (NEXT disabled)

---

## Troubleshooting

**اگر Scenario 1 fail شد:**
- Console → State transitions را بررسی کن
- Network tab → آیا chunk دریافت شد؟
- UI → آیا buffering progress update شد؟

**اگر Scenario 2 hang کرد:**
- Console → آیا state transition به 'error' انجام شد؟
- Network tab → آیا request fail شد؟
- UI → آیا error handling code اجرا شد؟
- Backend console → آیا error log وجود دارد؟

**اگر NEXT button enabled نشد:**
- بررسی کن که `bufferedChunks >= 1`
- بررسی کن که `state !== 'buffering'` یا `state === 'error'`
- Console → State logs را بررسی کن

---

## Notes

- **Critical:** Scenario 2 باید ثابت کند که UI hang نمی‌کند
- **Important:** State transitions باید در console log شوند (dev mode)
- **Check:** NEXT button باید enabled شود وقتی bufferedChunks >= 1
- **Verify:** Error case باید از buffering خارج شود

---

## Expected Behavior

**Scenario 1:**
1. Click "Hear AI" → "Buffering 0/1", NEXT disabled
2. Chunk ready → "Buffering 1/1" (یا "Playing 1/1"), NEXT enabled
3. Playback starts → Progress updates, NEXT usable

**Scenario 2:**
1. Click "Hear AI" → "Buffering 0/1", NEXT disabled
2. Error occurs → State: error, Buffering hidden, Error visible
3. UI responsive → NEXT enabled, Buttons clickable, No hang

