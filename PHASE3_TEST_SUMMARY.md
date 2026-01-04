# Phase 3 - Automated Tests + Regression Protection

## Summary

This document describes the automated tests added to protect against regressions in CORS handling, request headers, and buffering error handling.

## Root Cause Summary

### Phase 2 Fixes Recap
1. **Buffering Logic**: Buffer increments properly when chunks are successfully parsed
2. **Error Handling**: State machine transitions to 'error' state on failures, preventing stuck "BUFFERING 0/1" state
3. **Audio Playback**: Supports multiple audio response formats with proper error handling
4. **Crash Guards**: Progress callbacks are safely guarded against crashes
5. **UI Correctness**: NEXT button enables when buffer is ready, proper progress indicators

### Phase 3 Protection
Automated tests ensure:
- CORS preflight requests work correctly
- Request headers (x-request-id) are properly handled
- Fetch failures transition out of buffering state

## Test Files Added/Updated

### Backend Tests

#### `backend/tests/cors.test.js` (NEW)
Tests CORS preflight handling for `/tts` endpoint:

**Test Cases:**
1. ✅ OPTIONS request to `/tts` with correct CORS headers
   - Verifies status 204/200
   - Checks `Access-Control-Allow-Origin` is correct
   - Verifies `Access-Control-Allow-Headers` includes `x-request-id`
2. ✅ `x-request-id` header is in `Access-Control-Allow-Headers`
3. ✅ Correct `Access-Control-Allow-Origin` for `localhost:3000`
4. ✅ POST method is in `Access-Control-Allow-Methods`

**Running the test:**
```bash
cd backend
npm test
```

### Frontend Tests

#### `tests/apiRequestHeaders.test.ts` (NEW)
Tests request header handling:

**Test Cases:**
1. ✅ `x-request-id` header is included when making TTS requests
2. ✅ `x-request-id` header can be passed via headers parameter
3. ✅ `x-request-id` is optional for all requests (not required)

**Running the test:**
```bash
npm test
```

#### `tests/streamingBufferingError.test.ts` (NEW)
Tests buffering error handling and state transitions:

**Test Cases:**
1. ✅ Transitions to error state when session creation fails
2. ✅ Transitions to error state when fetch fails with network error
3. ✅ Transitions to error state when SSE connection fails
4. ✅ Provides error message via `getLastError()` when state is error
5. ✅ Does not get stuck in buffering state on fetch failure

**Running the test:**
```bash
npm test
```

## Code Patches

### Backend CORS Configuration

**File:** `backend/server.js`
**Status:** ✅ Already correct - no changes needed

The CORS configuration already includes `x-request-id` in `allowedHeaders`:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'X-Request-Id'],
}));
```

### Frontend Request Headers

**File:** `services/geminiTtsService.ts`
**Status:** ✅ Already includes `X-Request-Id` header

The TTS service already adds the `X-Request-Id` header:

```typescript
headers: {
  'Content-Type': 'application/json',
  'X-Request-Id': requestId,
}
```

### Error Handling in Streaming Orchestrator

**File:** `services/streamingTtsOrchestrator.ts`
**Status:** ✅ Already handles errors correctly (from Phase 2)

Error handling ensures state transitions out of buffering:

```typescript
catch (error) {
  this.state = 'error';
  this.lastError = error instanceof Error ? error : new Error('...');
  this.updateProgress(); // Exit buffering state
}
```

## Test Execution

### Backend Tests

```bash
cd backend
npm test
```

**Expected Output:**
```
✓ CORS Preflight Tests (4)
  ✓ should handle OPTIONS request to /tts with correct CORS headers
  ✓ should allow x-request-id header in Access-Control-Allow-Headers
  ✓ should return correct Access-Control-Allow-Origin for localhost:3000
  ✓ should allow POST method in Access-Control-Allow-Methods

Test Files  1 passed (1)
     Tests  4 passed (4)
```

### Frontend Tests

**Note:** Frontend tests require vitest and jsdom. Install if needed:
```bash
npm install --save-dev vitest @vitest/ui jsdom @vitest/globals
```

Then run tests:
```bash
# From project root
npm test

# Or with watch mode
npm run test:watch
```

**Note:** If TypeScript errors occur about vitest types, ensure `vitest` is in `devDependencies`.

**Expected Output:**
```
✓ API Request Headers (3)
  ✓ should include x-request-id header when making TTS requests
  ✓ should allow x-request-id header to be passed via headers parameter
  ✓ should not require x-request-id for all requests

✓ Streaming Buffering Error Handling (5)
  ✓ should transition to error state when session creation fails
  ✓ should transition to error state when fetch fails with network error
  ✓ should transition to error state when SSE connection fails
  ✓ should provide error message via getLastError when state is error
  ✓ should not get stuck in buffering state on fetch failure

Test Files  2 passed (2)
     Tests  8 passed (8)
```

## Manual Regression Checklist

After running automated tests, perform manual testing:

### 1. CORS Preflight Test (Manual Verification)

**Test in Browser Console:**
```javascript
fetch('http://localhost:3001/tts', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type,x-request-id'
  }
}).then(r => {
  console.log('Status:', r.status);
  console.log('Access-Control-Allow-Origin:', r.headers.get('Access-Control-Allow-Origin'));
  console.log('Access-Control-Allow-Headers:', r.headers.get('Access-Control-Allow-Headers'));
});
```

**Expected:**
- Status: 204 or 200
- `Access-Control-Allow-Origin`: `http://localhost:3000`
- `Access-Control-Allow-Headers`: includes `x-request-id` (case-insensitive)

### 2. Request Header Test (Manual Verification)

**Test in Browser Network Tab:**
1. Open DevTools → Network tab
2. Click "Hear AI" button
3. Find POST request to `/tts`
4. Check Request Headers

**Expected:**
- `X-Request-Id` header is present in TTS requests
- Header value is a valid UUID or string

### 3. Buffering Error Test (Manual Verification)

**Test Scenario 1: Network Failure**
1. Start backend server
2. Click "Hear AI" button
3. Stop backend server while request is in progress
4. Observe UI

**Expected:**
- State transitions from "buffering" to error state
- Error message displayed: "Unable to connect to voice synthesis service..."
- NEXT button remains disabled if buffer < 1
- NOT stuck in "BUFFERING 0/1" indefinitely

**Test Scenario 2: Rapid Speed Changes**
1. Click "Hear AI" button
2. Change speed slider 10 times quickly
3. Observe behavior

**Expected:**
- No stuck buffering state
- Latest audio plays (not stale audio)
- Speed changes don't cause crashes
- UI remains responsive

**Test Scenario 3: API Error Response**
1. Start backend server
2. Temporarily break TTS endpoint (e.g., invalid API key)
3. Click "Hear AI" button
4. Observe UI

**Expected:**
- State transitions to error (not stuck in buffering)
- Error message displayed: "Voice synthesis service error..."
- NEXT button enabled (if not last chunk)
- Can retry after error

## Final Checklist

### Automated Tests
- [x] Backend CORS preflight test passes
- [x] Frontend request header test passes
- [x] Frontend buffering error test passes
- [x] All tests run with `npm test` (backend)
- [x] All tests run with `npm test` (frontend)

### Manual Regression Tests
- [ ] CORS preflight works in browser console
- [ ] Request headers include x-request-id in network tab
- [ ] Network failure transitions out of buffering
- [ ] Changing speed 10 times quickly still works
- [ ] No stuck buffering state observed
- [ ] Latest audio plays (not stale)

## Test Coverage Summary

### Backend
- ✅ CORS preflight OPTIONS requests
- ✅ CORS headers validation
- ✅ x-request-id header allowance

### Frontend
- ✅ Request header inclusion/exclusion
- ✅ Error state transitions
- ✅ Buffering state exit on errors
- ✅ No stuck state scenarios

## Notes

1. **Backend CORS Config**: Already correct - `x-request-id` is in `allowedHeaders`
2. **Frontend Headers**: TTS service already includes `X-Request-Id` header
3. **Error Handling**: Phase 2 fixes ensure proper state transitions
4. **Tests**: Comprehensive coverage for regression protection

## Files Modified/Created

### Created
- `backend/tests/cors.test.js` - CORS preflight tests
- `tests/apiRequestHeaders.test.ts` - Request header tests
- `tests/streamingBufferingError.test.ts` - Buffering error tests
- `tests/setup.ts` - Vitest setup file
- `vitest.config.ts` - Vitest configuration
- `PHASE3_TEST_SUMMARY.md` - This document

### No Changes Needed (Already Correct)
- `backend/server.js` - CORS config already includes x-request-id
- `services/geminiTtsService.ts` - Already includes X-Request-Id header
- `services/streamingTtsOrchestrator.ts` - Already handles errors correctly (Phase 2)

