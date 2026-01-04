# CORS Error Diagnosis - Phase 1 Complete

## Root Cause

**Problem**: Frontend sends `X-Request-Id` header in requests to `/tts`, but backend CORS configuration doesn't allow this header, causing preflight OPTIONS requests to fail.

## Findings

### Frontend: Where `X-Request-Id` is Added

1. **File**: `services/geminiTtsService.ts`
   - **Line 119**: `'X-Request-Id': requestId` in `fetchTtsAudioByHash()` function
   - **Line 316**: `'X-Request-Id': requestId` in `fetchTtsAudio()` function

   Both functions add the header when making POST requests to `/tts` endpoint.

### Backend: CORS Configuration

**File**: `backend/server.js`
- **Lines 53-61**: CORS middleware configuration
  ```javascript
  app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],  // ❌ Missing 'x-request-id'
  }));
  ```

**Issue**: The `allowedHeaders` array only includes `'Content-Type'` and `'Authorization'`, but the frontend is sending `'X-Request-Id'` header, which is not allowed.

### Preflight Behavior

When the browser sees a custom header (`X-Request-Id`) in a cross-origin request, it sends a preflight OPTIONS request. The backend's CORS middleware should respond with `Access-Control-Allow-Headers` that includes `x-request-id`, but currently it doesn't, causing the browser to block the actual POST request.

## Root Cause Statement

**The frontend `geminiTtsService.ts` adds `X-Request-Id` header to all TTS requests for debugging/tracking purposes, but the backend CORS configuration in `server.js` (line 60) doesn't include this header in the `allowedHeaders` array. This causes the browser to block the requests after the preflight OPTIONS check fails, resulting in CORS errors and broken audio playback.**

## Solution Approach

1. **Server-side fix (preferred)**: Add `'x-request-id'` (or `'X-Request-Id'`) to the `allowedHeaders` array in backend CORS config
2. **Client-side fallback (optional)**: Handle CORS errors gracefully and surface them to the UI

