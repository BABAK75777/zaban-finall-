# CORS Preflight Diagnosis Guide

## Current Configuration Analysis

### Frontend Request Headers (from code):
- `Content-Type: application/json`
- `X-Request-Id: <requestId>`

### Backend CORS Configuration (from server.js):
```javascript
allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'X-Request-Id']
methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
origin: ['http://localhost:3000', 'http://127.0.0.1:3000']
```

**Note:** The backend allows both `x-request-id` (lowercase) and `X-Request-Id` (uppercase), so header case should not be an issue.

---

## Step-by-Step Diagnosis Instructions

### Step 1: Open Chrome DevTools
1. Press `F12` or right-click → Inspect
2. Go to the **Network** tab
3. Check **"Preserve log"** checkbox (important!)
4. In the filter box, type: `tts`

### Step 2: Trigger the TTS Request
- Click play button OR change speed setting
- This should trigger `POST http://localhost:3001/tts`

### Step 3: Check for OPTIONS Request
Look in the Network tab for:
- An `OPTIONS` request to `/tts` (this is the preflight)
- A `POST` request to `/tts` (the actual request)

### Step 4: Collect OPTIONS Request Data

**Click on the OPTIONS /tts request** (if it exists):

#### A. Request Headers Tab:
- Find: `Access-Control-Request-Headers`
- Copy the exact value (should be something like: `content-type, x-request-id`)

#### B. Response Headers Tab:
- Find: `access-control-allow-origin` (exact value)
- Find: `access-control-allow-methods` (exact value)
- Find: `access-control-allow-headers` (exact value)

#### C. General Tab:
- Status Code: (e.g., 204, 200, or failed)

### Step 5: Check POST Request (if it happened)
- Click on the `POST /tts` request
- Check Status Code
- If failed, check the error message

### Step 6: Verify Frontend Origin
In the Network tab, check what origin the request is coming from:
- Look at the request URL - is it `http://localhost:3000` or `http://127.0.0.1:3000`?
- The backend only allows these two origins

---

## Expected Results

### If CORS is Working:
- OPTIONS request should return **204** or **200**
- Response headers should include all required CORS headers
- POST request should proceed normally

### If CORS is Blocking:
- OPTIONS request might be missing
- OPTIONS request might return an error
- POST request might be blocked with CORS error
- Browser console might show: `"Access to fetch at '...' from origin '...' has been blocked by CORS policy"`

---

## Common Issues to Check

1. **Origin Mismatch:**
   - Frontend running on different port (e.g., 5173 for Vite)
   - Backend only allows `localhost:3000` and `127.0.0.1:3000`
   - **Fix:** Add your frontend origin to backend CORS config

2. **Header Case Sensitivity:**
   - Browser sends `X-Request-Id` but backend expects exact match
   - **Status:** Backend allows both cases, so this should be OK

3. **Missing OPTIONS Handler:**
   - Backend might not be handling OPTIONS requests
   - **Status:** CORS middleware should handle this automatically

4. **Additional Headers:**
   - Browser might be adding headers not in allowed list
   - Check `Access-Control-Request-Headers` in OPTIONS request

---

## Output Format

After collecting the data, format it as:

```
PHASE1_RESULT:
- OPTIONS_seen: yes/no
- OPTIONS_status: <status code or "failed" or "N/A">
- A-C-Allow-Origin: <exact value or "N/A">
- A-C-Allow-Methods: <exact value or "N/A">
- A-C-Allow-Headers: <exact value or "N/A">
- Access-Control-Request-Headers: <exact value or "N/A">
- Notes: <one line description>
```

---

## Quick Test Script

You can also run the diagnostic script in the browser console:
1. Open Console tab in DevTools
2. Copy and paste the contents of `CORS_DIAGNOSTIC_SCRIPT.js`
3. Press Enter
4. Follow the instructions it provides

---

## What to Report

Please provide:
1. Screenshot of Network tab showing OPTIONS and POST requests
2. Screenshot of OPTIONS request Headers tab (Request Headers section)
3. Screenshot of OPTIONS request Headers tab (Response Headers section)
4. Screenshot of any error messages in Console tab
5. The formatted PHASE1_RESULT output

