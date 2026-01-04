# Phase 2: Expected Behavior Analysis

## Code Analysis Summary

Based on the codebase analysis, here's what should happen:

### Frontend Request (services/geminiTtsService.ts)
The frontend sends a POST request to `/tts` with:
- **Method:** `POST`
- **Headers:**
  - `Content-Type: application/json`
  - `X-Request-Id: <requestId>`
- **Body (JSON):**
  - `text` (string)
  - `hash` (string) ← **This is always included**
  - `voiceId` (optional)
  - `preset` (optional)
  - `speed` (optional)
  - `pitch` (optional)
  - `format` (optional)
  - `sampleRate` (optional)

### Backend Response Logic (backend/server.js)

Since the frontend **always includes `hash`** in the request, the backend will return **JSON response** (not binary).

#### Success Response (Status 200)
```json
{
  "ok": true,
  "hash": "<cache-hash>",
  "voiceId": "en-US-Standard-C",
  "preset": "default",
  "format": "mp3",
  "audioBase64": "<base64-encoded-audio>",
  "durationMsEstimate": 1234,
  "sampleRate": 24000,
  "normalized": true,
  "cacheHit": true  // Only if cache hit
}
```

**Response Headers:**
- `Content-Type: application/json`

#### Cache Hit Response
Same structure as above, but includes `cacheHit: true`.

#### Error Response (Status 400/500)
```json
{
  "ok": false,
  "error": "<ERROR_CODE>",
  "details": "<error message>"
}
```

**Response Headers:**
- `Content-Type: application/json`

### Expected Results

Based on this analysis, you should see:

```
PHASE2_RESULT:
- POST_seen: yes
- POST_status: 200 (if successful) or 400/500 (if error)
- Content-Type: application/json
- Body_type: JSON
- Keys_or_binary_info: ok, hash, voiceId, preset, format, audioBase64, durationMsEstimate, sampleRate, normalized, [cacheHit]. audioBase64 exists
- Notes: Successful JSON response with audioBase64 field
```

### Possible Variations

1. **If cache hit:** Response will include `cacheHit: true` key
2. **If error:** Response will have `ok: false`, `error`, and `details` keys (no audio fields)
3. **If request blocked:** POST_seen will be `no` and status will be `N/A` or `failed`

### What to Check

1. ✅ **POST request exists** - Should be visible in Network tab
2. ✅ **Status code** - Should be 200 for success
3. ✅ **Content-Type** - Should be `application/json`
4. ✅ **JSON keys** - Should include `audioBase64` field
5. ✅ **Audio data** - `audioBase64` should contain base64-encoded audio string

### Red Flags

- ❌ POST request not visible → CORS blocking or request not triggered
- ❌ Status 400/500 → Check error details in response
- ❌ Content-Type is `audio/*` → Unexpected (should be JSON when hash is provided)
- ❌ No `audioBase64` field → Backend error or unexpected response format
- ❌ Empty `audioBase64` → Backend generation failed

