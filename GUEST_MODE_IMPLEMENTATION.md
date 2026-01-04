# Guest Mode Implementation - Complete

This document details all changes made to enable guest mode (no authentication) for development.

## Summary

The app now supports two authentication modes:
- **Guest Mode** (`guest`): No authentication required, app works immediately, DB optional
- **JWT Mode** (`jwt`): Authentication required (future passwordless auth)

Both frontend and backend default to **guest mode** for development.

---

## Frontend Changes

### 1. App.tsx
**File:** `App.tsx`
**Changes:**
- Changed default `VITE_AUTH_MODE` from `'jwt'` to `'guest'`
- In guest mode, app directly shows `ReadingScreen` (no auth screen)
- No `/auth/me` calls in guest mode
- Navigation bar shows "Guest Mode" instead of user email

**Key Code:**
```typescript
const authMode = env.VITE_AUTH_MODE || 'guest'; // Default to guest
const isGuestMode = authMode === 'guest';
// ... authenticated state defaults to true in guest mode
```

### 2. AuthScreen.tsx
**File:** `components/AuthScreen.tsx`
**Changes:**
- **Removed password field completely** (passwordless auth for future)
- Removed signup/login mode toggle
- Simplified to email-only form (placeholder for future passwordless implementation)
- In guest mode, this screen is never shown

### 3. services/api.ts
**File:** `services/api.ts`
**Changes:**
- Auth headers are only injected when `VITE_AUTH_MODE === 'jwt'`
- In guest mode, no Authorization header is sent

**Key Code:**
```typescript
const authMode = env.VITE_AUTH_MODE || 'guest';
let authHeaders: Record<string, string> = {};

if (authMode === 'jwt') {
  // Only inject auth headers in JWT mode
  const authModule = await import('./auth');
  authHeaders = authModule.getAuthHeaders();
}
```

### 4. .env.local
**File:** `.env.local` (root directory)
**Required addition:**
```env
VITE_API_URL=http://localhost:3001
VITE_AUTH_MODE=guest
```

**Note:** If `.env.local` doesn't exist or is missing `VITE_AUTH_MODE`, it defaults to `guest`.

---

## Backend Changes

### 1. server.js
**File:** `backend/server.js`
**Changes:**
- Reads `AUTH_MODE` environment variable (defaults to `'guest'`)
- DB initialization is optional in guest mode
- In guest mode, server starts even if DB env vars are missing
- Logs: `"[DB] DB disabled (dev guest mode). TTS routes will work without database."`

**Key Code:**
```javascript
const authMode = process.env.AUTH_MODE || 'guest'; // Default to guest
const isGuestMode = authMode === 'guest';

if (process.env.NODE_ENV === 'production' && !isGuestMode) {
  // Production with JWT: DB required
  // ... error if DB missing
} else {
  // Guest mode or dev: DB optional
  const dbResult = initDb();
  if (!dbResult && isGuestMode) {
    console.log('[DB] DB disabled (dev guest mode). TTS routes will work without database.');
  }
}
```

### 2. middleware/auth.js
**File:** `backend/middleware/auth.js`
**Changes:**
- `isGuestMode()` now defaults to `'guest'` if `AUTH_MODE` is not set
- Both `requireAuth` and `optionalAuth` skip authentication in guest mode
- All routes (including `/tts`) work without JWT tokens in guest mode

**Key Code:**
```javascript
function isGuestMode() {
  const authMode = process.env.AUTH_MODE || 'guest';
  return authMode === 'guest';
}

export async function requireAuth(req, res, next) {
  // Skip auth in guest mode
  if (isGuestMode()) {
    return next();
  }
  // ... JWT validation for jwt mode
}
```

### 3. routes/usage.js
**File:** `backend/routes/usage.js`
**Changes:**
- Dashboard endpoint returns 503 in guest mode (as required)
- Prevents DB queries when DB/auth not available

**Key Code:**
```javascript
router.get('/dashboard', requireAuth, async (req, res) => {
  const authMode = process.env.AUTH_MODE || 'guest';
  if (authMode === 'guest' || !req.user) {
    return res.status(503).json({
      ok: false,
      error: 'SERVICE_UNAVAILABLE',
      details: 'Dashboard is not available in guest mode'
    });
  }
  // ... dashboard logic
});
```

### 4. db/index.js
**File:** `backend/db/index.js`
**Status:** No changes needed
- Already handles missing DB gracefully (returns `null`, sets `dbReady = false`)
- No crashes when DB env vars are missing

---

## Environment Variables

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3001
VITE_AUTH_MODE=guest  # Options: "guest" | "jwt" (default: "guest")
```

### Backend (environment or .env)
```env
AUTH_MODE=guest  # Options: "guest" | "jwt" (default: "guest")
PORT=3001
GOOGLE_API_KEY=your_key_here  # Required for TTS
# DB env vars are optional in guest mode:
# DB_HOST=localhost
# DB_USER=postgres
# DB_NAME=zaban
# DB_PASSWORD=password
```

---

## Running the Application

### Terminal 1: Backend Server
```powershell
cd backend
npm install  # First time only
npm run dev
```

**Expected Output (Guest Mode):**
```
[DB] DB disabled (missing env vars: DB_HOST, DB_USER, DB_NAME, DB_PASSWORD). Running in no-db mode.
[TTS:Cache] Created cache directory: ...
✅ Backend API server running on http://localhost:3001
   Health check: http://localhost:3001/health
```

### Terminal 2: Frontend Dev Server
```powershell
# Make sure you're in project root (zaban2)
npm install  # First time only
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:3000/
```

### Verify Guest Mode
1. Open browser: `http://localhost:3000`
2. Should see "Guest Mode" in navigation bar (no sign-in screen)
3. Should see "API Connected" banner (green)
4. TTS should work immediately

---

## Testing Checklist

### Guest Mode ON (Default)
- [x] Frontend: Opens main app without login screen
- [x] Frontend: Shows "Guest Mode" in navigation bar
- [x] Frontend: No password field in AuthScreen (if somehow accessed)
- [x] Backend: Starts without DB (if DB env vars missing)
- [x] Backend: `/healthz` returns 200
- [x] Backend: `POST /tts` with text returns audio/ok
- [x] Backend: `/usage/dashboard` returns 503 (expected)
- [x] Backend: No Authorization header required for TTS routes

### Guest Mode OFF (JWT Mode - Optional Test)
To test JWT mode (future passwordless auth):
1. Set `VITE_AUTH_MODE=jwt` in `.env.local`
2. Set `AUTH_MODE=jwt` in backend environment
3. Ensure DB is configured
4. Frontend will show AuthScreen (passwordless, email-only)
5. Backend will require JWT tokens

---

## Feature Flag Structure

All authentication logic is controlled by environment variables:
- `VITE_AUTH_MODE` (frontend): Controls whether to show auth screen and inject auth headers
- `AUTH_MODE` (backend): Controls whether to require JWT validation

This makes it easy to:
- Switch between guest and JWT modes
- Re-enable auth later
- Test both modes without code changes

---

## Files Modified

### Frontend
1. `App.tsx` - Default to guest mode, skip auth screen
2. `components/AuthScreen.tsx` - Removed password field
3. `services/api.ts` - Conditionally inject auth headers
4. `.env.local` - Added `VITE_AUTH_MODE=guest` (user must add manually)

### Backend
1. `backend/server.js` - Make DB optional in guest mode
2. `backend/middleware/auth.js` - Default to guest mode, skip JWT validation
3. `backend/routes/usage.js` - Return 503 for dashboard in guest mode

### Files Not Modified (Already Guest-Mode Compatible)
- `backend/db/index.js` - Already handles missing DB gracefully
- `backend/middleware/quotas.js` - Already skips quota checks when no user

---

## Important Notes

1. **No Password Fields:** Password input has been completely removed from the UI
2. **Guest Mode Default:** Both frontend and backend default to guest mode
3. **DB Optional:** Backend starts successfully without DB in guest mode
4. **TTS Works:** All TTS routes (`/tts`, `/tts/session`, etc.) work in guest mode
5. **Dashboard Disabled:** Usage dashboard returns 503 in guest mode (expected)
6. **Future-Ready:** Code structured to easily re-enable JWT auth later

---

## Manual Step Required

**You must manually add `VITE_AUTH_MODE=guest` to `.env.local`:**

```powershell
# PowerShell command to add the line (if .env.local exists)
Add-Content -Path .env.local -Value "`nVITE_AUTH_MODE=guest"

# Or edit manually to ensure it looks like:
# VITE_API_URL=http://localhost:3001
# VITE_AUTH_MODE=guest
```

**Note:** The frontend will default to `guest` even without this line, but it's best practice to set it explicitly.

---

## Smoke Tests

### Backend
```powershell
# Health check
Invoke-WebRequest -Uri "http://localhost:3001/healthz" | Select-Object -ExpandProperty Content
# Expected: {"ok":true}

# TTS test
$body = @{ text = "Hello world" } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3001/tts" -Method POST -Body $body -ContentType "application/json" | Select-Object StatusCode
# Expected: 200 OK (or 500 if GOOGLE_API_KEY not set, but no auth error)
```

### Frontend
1. Open `http://localhost:3000`
2. Should see main app immediately (no login screen)
3. Should see "Guest Mode" in navigation
4. Should see "API Connected" banner

---

## Re-enabling JWT Auth (Future)

To switch back to JWT mode:

1. **Frontend:** Set `VITE_AUTH_MODE=jwt` in `.env.local`
2. **Backend:** Set `AUTH_MODE=jwt` in environment
3. **Backend:** Ensure DB is configured
4. **Frontend:** Implement passwordless auth in `AuthScreen.tsx`

The code structure supports both modes seamlessly.
