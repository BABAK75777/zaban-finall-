# Phase 2: Data Collection Template

## Copy this template and fill it with your observations

---

## Test 1: Normal Playback

### Network Tab → POST /tts Response

**Response Body (JSON):**
```json
{
  "ok": _______________,
  "audioBase64": "...",
  "mimeType": _______________,
  "durationMsEstimate": _______________
}
```

**Collected Data:**
- [ ] ok: true / false
- mimeType: _______________
- audioBase64_length: _______________ (length of audioBase64 string)

### UI Observation

**After Request Completes:**
- [ ] UI State: playing / idle / loading / error
- [ ] Audio playing: yes / no
- [ ] Error visible: yes / no
- [ ] Button state: _______________

### Console Tab

- [ ] Errors: yes / no
- Error details: _______________

---

## Test 2: Error Case

### Network Tab → POST /tts Response

**Response Body (JSON):**
```json
{
  "ok": false,
  "error": _______________,
  "debugId": _______________,
  "details": _______________
}
```

**Collected Data:**
- [ ] ok: false
- error: NO_AUDIO / PROVIDER_ERROR / other: _______________
- debugId_present: yes / no
- debugId value: _______________

### UI Observation

**After Error:**
- [ ] UI State: error / idle / hung
- [ ] Error message visible: yes / no
- [ ] Error message text: _______________
- [ ] UI frozen: yes / no
- [ ] Buttons clickable: yes / no
- [ ] Buffering stuck: yes / no (critical!)

### Console Tab

- [ ] Errors: yes / no
- Error details: _______________
- [ ] debugId in error: yes / no

---

## Final Output

After filling the template above, format your output as:

```
PHASE2_TEST_RESULT:
- Normal: {ok: <true/false>, mimeType: <value>, audioBase64_length: <number>, UI_state_after: <value>}
- ErrorCase: {ok: false, error: <value>, debugId_present: <yes/no>, UI_state_after: <value>}
```

### Example Output:

```
PHASE2_TEST_RESULT:
- Normal: {ok: true, mimeType: audio/mpeg, audioBase64_length: 45678, UI_state_after: playing}
- ErrorCase: {ok: false, error: NO_AUDIO, debugId_present: yes, UI_state_after: error}
```

---

## Critical Checks

✅ **Normal:**
- ok must be true
- audioBase64_length must be > 1000
- mimeType must be present and valid
- UI should be playing or idle (not error)

✅ **ErrorCase:**
- ok must be false
- error must be NO_AUDIO or PROVIDER_ERROR
- debugId_present must be yes
- UI_state_after must NOT be hung
- UI must exit buffering
- Error message must be visible
- UI must NOT be frozen

---

## Screenshots (Optional but Recommended)

If possible, take screenshots of:
1. Network tab → Response body (Normal case)
2. Network tab → Response body (Error case)
3. UI showing error message
4. Console showing errors (if any)

