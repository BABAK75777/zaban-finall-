# Phase 2: POST /tts Request Diagnosis

## Goal
Determine whether POST /tts is actually sent and what the response contains.

---

## Expected Response Formats

Based on the code analysis:

### Scenario 1: JSON Response (when `hash` is provided in request)
- **Content-Type:** `application/json`
- **Top-level keys:**
  - `ok` (boolean)
  - `hash` (string)
  - `voiceId` (string)
  - `preset` (string)
  - `format` (string: 'mp3', 'wav', 'ogg')
  - `audioBase64` (string) ← **Audio field**
  - `durationMsEstimate` (number)
  - `sampleRate` (number)
  - `normalized` (boolean)
  - `cacheHit` (boolean, optional - only if cache hit)

### Scenario 2: Binary Response (legacy, when no `hash`)
- **Content-Type:** `audio/mpeg` (mp3), `audio/wav` (wav), or `audio/ogg` (ogg)
- **Body:** Binary audio data
- **Headers:** `Content-Length` (bytes), `X-Cache-Hit` (optional)

### Scenario 3: Error Response
- **Content-Type:** `application/json`
- **Top-level keys:**
  - `ok` (boolean: false)
  - `error` (string: error code)
  - `details` (string: error message)

---

## Step-by-Step Instructions

### Step 1: Open Network Tab
1. Open Chrome DevTools (`F12`)
2. Go to **Network** tab
3. Check **"Preserve log"** checkbox
4. In the filter box, type: `tts`

### Step 2: Trigger TTS Request
- Click play button OR change speed setting
- This should trigger `POST http://localhost:3001/tts`

### Step 3: Find POST /tts Request
Look in the Network tab for:
- A request with method `POST` and URL containing `/tts`
- It should appear after any OPTIONS preflight request (if present)

### Step 4: Check if POST Request Exists
- **POST_seen:** `yes` if you see a POST request, `no` if you don't

### Step 5: Collect Request Details

**Click on the POST /tts request:**

#### A. General Tab (or Status column):
- **POST_status:** Status code (e.g., 200, 400, 500, or "failed"/"blocked")

#### B. Headers Tab → Response Headers:
- **Content-Type:** Find `content-type` header (exact value)
  - Examples: `application/json`, `audio/mpeg`, `audio/wav`, `audio/ogg`

#### C. Response Tab (or Preview Tab):
This is where you'll determine the body type:

**If Content-Type is `application/json`:**
1. Click on **Response** or **Preview** tab
2. You should see JSON data
3. List all top-level keys (exact names):
   - Look for: `ok`, `hash`, `voiceId`, `preset`, `format`, `audioBase64`, `durationMsEstimate`, `sampleRate`, `normalized`, `cacheHit`
4. Check if any audio field exists:
   - `audioBase64` (most likely)
   - `audioContent` (alternative)
   - `inlineData` (alternative)
   - `mimeType` (if present)

**If Content-Type is `audio/*`:**
1. The response is binary audio
2. Check **Headers** tab → Response Headers:
   - `content-length` (bytes)
   - `content-type` (mime type)
3. Calculate size:
   - Size in bytes from `content-length`
   - Convert to KB: `bytes / 1024`
   - Convert to MB: `bytes / (1024 * 1024)`
4. Note the mime type (e.g., `audio/mpeg`, `audio/wav`, `audio/ogg`)

#### D. Check for Errors:
- If status is not 200, check **Response** tab for error JSON
- Look for `ok: false`, `error`, and `details` fields

---

## Output Format

Fill in the following:

```
PHASE2_RESULT:
- POST_seen: yes/no
- POST_status: <status code or "failed"/"blocked"/"N/A">
- Content-Type: <exact value or "N/A">
- Body_type: JSON or binary
- Keys_or_binary_info: 
  - If JSON: list all top-level keys (comma-separated), and note if audioBase64/audioContent/inlineData/mimeType exists
  - If binary: size in KB/MB and mime type (e.g., "125 KB, audio/mpeg")
- Notes: <one line description of what you observed>
```

---

## Example Outputs

### Example 1: Successful JSON Response
```
PHASE2_RESULT:
- POST_seen: yes
- POST_status: 200
- Content-Type: application/json
- Body_type: JSON
- Keys_or_binary_info: ok, hash, voiceId, preset, format, audioBase64, durationMsEstimate, sampleRate, normalized, cacheHit. audioBase64 exists
- Notes: Successful JSON response with audioBase64 field
```

### Example 2: Binary Response
```
PHASE2_RESULT:
- POST_seen: yes
- POST_status: 200
- Content-Type: audio/mpeg
- Body_type: binary
- Keys_or_binary_info: 245 KB, audio/mpeg
- Notes: Binary audio response received
```

### Example 3: Error Response
```
PHASE2_RESULT:
- POST_seen: yes
- POST_status: 400
- Content-Type: application/json
- Body_type: JSON
- Keys_or_binary_info: ok, error, details. No audio fields
- Notes: Error response - EMPTY_TEXT error
```

### Example 4: Request Blocked
```
PHASE2_RESULT:
- POST_seen: no
- POST_status: N/A
- Content-Type: N/A
- Body_type: N/A
- Keys_or_binary_info: N/A
- Notes: POST request not seen - likely blocked by CORS or not triggered
```

---

## Quick Reference: What to Look For

| Content-Type | Body Type | Audio Field Location |
|--------------|-----------|---------------------|
| `application/json` | JSON | `audioBase64` (most likely) |
| `audio/mpeg` | Binary | N/A (binary data) |
| `audio/wav` | Binary | N/A (binary data) |
| `audio/ogg` | Binary | N/A (binary data) |

---

## Troubleshooting

### If POST request is not visible:
1. Check if request was actually triggered (look for any network activity)
2. Check Console tab for JavaScript errors
3. Check if request was blocked (red status, CORS error)
4. Verify backend server is running on `localhost:3001`

### If status is not 200:
1. Check Response tab for error details
2. Check Console tab for error messages
3. Check backend server logs

### If Content-Type is unexpected:
1. Check Request tab → Payload to see what was sent
2. Verify if `hash` was included in request body
3. Check backend code logic for response format selection

