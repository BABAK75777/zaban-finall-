# Phase 3: Normal vs Speed-Change Playback Comparison

## Goal
Compare requests and failures between normal playback and speed-adjusted playback to identify differences.

---

## Understanding the Two Scenarios

### Scenario A: Normal Playback
- **Trigger:** Click "Hear AI" button (or play button)
- **Function:** `handleHearAI()`
- **Text:** Current chunk text (variable length)
- **Player:** Uses `streamingTtsOrchestrator` or `ttsOrchestrator` (depending on feature flag)
- **Endpoint:** May use `/tts/session` (streaming) or `/tts` (direct)

### Scenario B: Speed Change Playback
- **Trigger:** Change speed slider and release
- **Function:** `triggerTestPlayback()`
- **Text:** Fixed test message: `"Voice check."`
- **Player:** Uses `chunkedTtsPlayer.play()`
- **Endpoint:** Always uses `/tts` (direct POST)

---

## Step-by-Step Instructions

### Part A: Normal Playback

1. **Prepare Network Tab:**
   - Open Chrome DevTools (`F12`)
   - Go to **Network** tab
   - Check **"Preserve log"** checkbox
   - Filter: `tts`
   - Clear existing requests (right-click → Clear)

2. **Trigger Normal Playback:**
   - **DO NOT touch the speed slider**
   - Click the "Hear AI" button (or play button)
   - Wait for playback to start/complete

3. **Capture Normal Playback Data:**
   - Look for `OPTIONS /tts` or `OPTIONS /tts/session` request
   - Look for `POST /tts` or `POST /tts/session` request
   - For each request, capture:
     - **Status code** (from General/Status column)
     - **Request Headers** (click request → Headers tab → Request Headers section)
       - Note: `Access-Control-Request-Headers` (if OPTIONS)
       - Note: `Content-Type`
       - Note: `X-Request-Id` (if POST)
     - **Request Body** (if POST, click Payload tab or Request tab)
     - **Response Headers** (Headers tab → Response Headers)
     - **Any errors** (red status, error in Console tab)

4. **Record Normal Playback:**
   ```
   Normal:
   - OPTIONS_status: <status or "none">
   - POST_status: <status>
   - Access-Control-Request-Headers: <value or "N/A">
   - Request_Headers: <list of headers>
   - Request_Body_text: <first 50 chars of text>
   - Errors: <any error messages>
   ```

### Part B: Speed Change Playback

1. **Clear Network Tab:**
   - Right-click in Network tab → Clear
   - Keep "Preserve log" checked

2. **Trigger Speed Change:**
   - **Change the speed slider** (move it to any different value)
   - **Release the slider** (this triggers `triggerTestPlayback()`)
   - Wait for test playback to start/complete

3. **Capture Speed Change Data:**
   - Look for `OPTIONS /tts` request
   - Look for `POST /tts` request
   - Capture the same details as Part A

4. **Record Speed Change Playback:**
   ```
   SpeedChanged:
   - OPTIONS_status: <status or "none">
   - POST_status: <status>
   - Access-Control-Request-Headers: <value or "N/A">
   - Request_Headers: <list of headers>
   - Request_Body_text: <should be "Voice check.">
   - Errors: <any error messages>
   ```

### Part C: Compare and Report Differences

Compare the two scenarios and note:

1. **Headers Comparison:**
   - Did `X-Request-Id` change? (should be different - new request ID)
   - Did `Content-Type` change? (should be same: `application/json`)
   - Did `Access-Control-Request-Headers` change? (should be same)

2. **Request Body Comparison:**
   - Did the `text` field change? (should be different: chunk text vs "Voice check.")
   - Did the `hash` field change? (should be different - different text = different hash)
   - Did other fields change? (voiceId, preset, speed, etc.)

3. **Endpoint Comparison:**
   - Did the endpoint change? (normal might use `/tts/session`, speed uses `/tts`)
   - Did the method change? (should be POST for both)

4. **Status Comparison:**
   - Did OPTIONS status change? (should be same if headers are same)
   - Did POST status change? (200 = success, 400/500 = error)
   - Did errors appear only in one scenario?

5. **Failure Analysis:**
   - Did failure appear only after speed change?
   - What was the error message?
   - Was it a CORS error, network error, or backend error?

---

## Output Format

```
PHASE3_RESULT:
- Normal: {OPTIONS_status: <value>, POST_status: <value>, Access-Control-Request-Headers: <value>, any errors: <value>}
- SpeedChanged: {OPTIONS_status: <value>, POST_status: <value>, Access-Control-Request-Headers: <value>, any errors: <value>}
- Diff_summary:
  • <exact difference 1>
  • <exact difference 2>
  • <exact difference 3>
  ...
```

---

## Expected Differences (Based on Code)

### Should Be Different:
- ✅ `X-Request-Id` - New request = new ID
- ✅ Request body `text` - Different text content
- ✅ Request body `hash` - Different text = different hash
- ✅ Endpoint (possibly) - Normal might use `/tts/session`, speed uses `/tts`

### Should Be Same:
- ✅ `Content-Type: application/json`
- ✅ `Access-Control-Request-Headers` (if OPTIONS appears)
- ✅ Request method: `POST`
- ✅ OPTIONS status (if headers are same)
- ✅ POST success/failure pattern (should both work or both fail)

### Red Flags (Indicates Problem):
- ❌ Different `Access-Control-Request-Headers` → Different headers being sent
- ❌ OPTIONS fails only in one scenario → CORS issue specific to that scenario
- ❌ POST fails only after speed change → Speed change triggers different code path with bug
- ❌ Different endpoints with different CORS behavior → Endpoint-specific CORS issue

---

## Quick Reference: What to Capture

### For OPTIONS Request:
- Status code
- Request Headers → `Access-Control-Request-Headers`
- Response Headers → `access-control-allow-origin`, `access-control-allow-methods`, `access-control-allow-headers`

### For POST Request:
- Status code
- Request Headers → `Content-Type`, `X-Request-Id`
- Request Payload → `text`, `hash`, `voiceId`, etc.
- Response Headers → `content-type`
- Response Body → Error message (if failed)

---

## Troubleshooting

### If you don't see requests:
1. Check Console tab for JavaScript errors
2. Verify backend is running
3. Check if request was actually triggered (look for any network activity)
4. Try refreshing and trying again

### If requests look identical but one fails:
1. Check timing - was there a delay?
2. Check Console for error messages
3. Check backend logs for differences
4. Check if cache was involved (cache hit vs miss)

### If you see different endpoints:
- Normal: `/tts/session` (streaming) vs `/tts` (direct)
- Speed: Always `/tts` (direct)
- This is expected - compare CORS config for both endpoints

