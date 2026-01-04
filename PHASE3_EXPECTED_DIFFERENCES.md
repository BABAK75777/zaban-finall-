# Phase 3: Expected Differences Analysis

## Code Analysis Summary

Based on the codebase analysis, here are the expected differences and similarities between normal playback and speed-change playback:

---

## Key Differences (Expected)

### 1. Request Body - Text Content
- **Normal:** Variable text (current chunk content)
- **Speed Change:** Fixed text: `"Voice check."`
- **Impact:** Different text = different hash in request body

### 2. Request Body - Hash
- **Normal:** Hash computed from chunk text
- **Speed Change:** Hash computed from "Voice check."
- **Impact:** Different hashes (expected)

### 3. X-Request-Id Header
- **Normal:** Unique request ID (monotonically increasing)
- **Speed Change:** Different unique request ID
- **Impact:** Should be different (new request = new ID)

### 4. Endpoint (Possibly)
- **Normal:** May use `/tts/session` (if streaming is enabled) OR `/tts` (direct)
- **Speed Change:** Always uses `/tts` (direct POST)
- **Impact:** Different endpoints might have different CORS behavior

### 5. Request Timing
- **Normal:** Triggered by user clicking "Hear AI"
- **Speed Change:** Triggered automatically after speed slider change
- **Impact:** May have different timing/race conditions

---

## Key Similarities (Expected)

### 1. Request Headers
- **Content-Type:** Both should send `application/json`
- **X-Request-Id:** Both should include this header (but different values)
- **Access-Control-Request-Headers:** Should be same if headers are same

### 2. Request Method
- Both should use `POST` method

### 3. CORS Preflight
- If headers are identical, OPTIONS request should behave the same
- Same `Access-Control-Request-Headers` value
- Same OPTIONS response status

### 4. Request Structure
- Both send JSON body with: `text`, `hash`, `voiceId`, `preset`, etc.
- Same structure, different values

---

## Potential Issues to Watch For

### Red Flag 1: Different Access-Control-Request-Headers
**Symptom:** OPTIONS request shows different headers in normal vs speed change
**Cause:** Different headers being sent (unexpected)
**Impact:** CORS might fail for one scenario

### Red Flag 2: Different Endpoints with Different CORS
**Symptom:** Normal uses `/tts/session`, speed uses `/tts`
**Cause:** Different endpoints might have different CORS config
**Impact:** One endpoint might be blocked while other works

### Red Flag 3: Error Only After Speed Change
**Symptom:** Normal works, speed change fails
**Cause:** Speed change triggers different code path with bug
**Impact:** Specific to speed change scenario

### Red Flag 4: Same X-Request-Id
**Symptom:** Both requests have same X-Request-Id
**Cause:** Request ID not being regenerated
**Impact:** Request sequencing issue

### Red Flag 5: Same Hash for Different Text
**Symptom:** Different text but same hash
**Cause:** Hash computation bug
**Impact:** Cache/request issues

---

## Expected Output Format

### If Everything Works:
```
PHASE3_RESULT:
- Normal: {OPTIONS_status: 204, POST_status: 200, Access-Control-Request-Headers: "content-type, x-request-id", any errors: none}
- SpeedChanged: {OPTIONS_status: 204, POST_status: 200, Access-Control-Request-Headers: "content-type, x-request-id", any errors: none}
- Diff_summary:
  • Request body text differs (expected - different content)
  • X-Request-Id is different (expected - new request)
  • Request body hash differs (expected - different text)
```

### If Speed Change Fails:
```
PHASE3_RESULT:
- Normal: {OPTIONS_status: 204, POST_status: 200, Access-Control-Request-Headers: "content-type, x-request-id", any errors: none}
- SpeedChanged: {OPTIONS_status: 204, POST_status: 400, Access-Control-Request-Headers: "content-type, x-request-id", any errors: {"ok":false,"error":"EMPTY_TEXT","details":"..."}}
- Diff_summary:
  • POST status differs: Normal=200, Speed=400
  • Error only in Speed: {"ok":false,"error":"EMPTY_TEXT","details":"..."}
```

### If CORS Issues:
```
PHASE3_RESULT:
- Normal: {OPTIONS_status: 204, POST_status: 200, Access-Control-Request-Headers: "content-type, x-request-id", any errors: none}
- SpeedChanged: {OPTIONS_status: failed, POST_status: failed, Access-Control-Request-Headers: "content-type, x-request-id", any errors: "CORS policy blocked"}
- Diff_summary:
  • OPTIONS status differs: Normal=204, Speed=failed
  • POST status differs: Normal=200, Speed=failed
  • Error only in Speed: "CORS policy blocked"
```

---

## What to Focus On

1. **Headers Consistency:** Are request headers the same between scenarios?
2. **Endpoint Differences:** Are different endpoints being used?
3. **Error Patterns:** Does one scenario consistently fail?
4. **Timing Issues:** Does speed change trigger requests too quickly?
5. **Request Sequencing:** Are requests being cancelled/overlapped?

---

## Diagnostic Checklist

- [ ] Normal playback: OPTIONS request appears and succeeds
- [ ] Normal playback: POST request appears and succeeds
- [ ] Speed change: OPTIONS request appears and succeeds
- [ ] Speed change: POST request appears and succeeds
- [ ] Both scenarios use same request headers (except X-Request-Id)
- [ ] Both scenarios have different X-Request-Id values
- [ ] Both scenarios have different request body text
- [ ] Both scenarios have different request body hash
- [ ] No CORS errors in either scenario
- [ ] No backend errors in either scenario

