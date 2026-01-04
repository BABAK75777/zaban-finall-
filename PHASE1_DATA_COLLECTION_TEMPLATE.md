# Phase 1: Data Collection Template

## Copy this template and fill it with your observations

---

## Test 1: Normal Playback

### Network Tab Evidence

**OPTIONS Request:**
- [ ] Seen: yes / no
- Status Code: _______________
- If failed, error: _______________

**POST Request:**
- [ ] Seen: yes / no
- Status Code: _______________
- If failed, error: _______________

### Console Tab Evidence

**CORS Errors:**
- [ ] CORS error present: yes / no
- Error message: _______________
- (If no error, write "none")

### Backend Console Evidence

**TTS Hit Log:**
- [ ] `[TTS] hit` seen: yes / no
- Timestamp: _______________

---

## Test 2: Speed Changed Playback

### Network Tab Evidence

**OPTIONS Request:**
- [ ] Seen: yes / no
- Status Code: _______________
- If failed, error: _______________

**POST Request:**
- [ ] Seen: yes / no
- Status Code: _______________
- If failed, error: _______________

### Console Tab Evidence

**CORS Errors:**
- [ ] CORS error present: yes / no
- Error message: _______________
- (If no error, write "none")

### Backend Console Evidence

**TTS Hit Log:**
- [ ] `[TTS] hit` seen: yes / no
- Timestamp: _______________

---

## Final Output

After filling the template above, format your output as:

```
PHASE1_TEST_RESULT:
- Normal: {OPTIONS_status: <value>, POST_status: <value>, any_console_error: <yes/no + details>, backend_hit_seen: yes/no}
- SpeedChanged: {OPTIONS_status: <value>, POST_status: <value>, any_console_error: <yes/no + details>, backend_hit_seen: yes/no}
```

### Example Output:

```
PHASE1_TEST_RESULT:
- Normal: {OPTIONS_status: 204, POST_status: 200, any_console_error: no, backend_hit_seen: yes}
- SpeedChanged: {OPTIONS_status: 204, POST_status: 200, any_console_error: no, backend_hit_seen: yes}
```

---

## Screenshots (Optional but Recommended)

If possible, take screenshots of:
1. Network tab showing OPTIONS and POST requests
2. Console tab showing any errors
3. Backend console showing `[TTS] hit` log

