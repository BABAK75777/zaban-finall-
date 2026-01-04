# Backend-Frontend Connection Guide

Complete guide to connecting the backend API to the frontend.

## Project Structure

```
zaban/
├── backend/           # Backend API server (Express.js)
│   ├── server.js
│   ├── package.json
│   └── README.md
└── zaban2/           # Frontend (React + Vite)
    ├── services/
    │   └── api.ts    # API client
    ├── App.tsx
    ├── .env.local
    └── package.json
```

## Step-by-Step Setup

### Step 1: Backend Setup

1. **Navigate to backend folder:**
   ```powershell
   cd ..\backend
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Start backend server:**
   ```powershell
   npm run dev
   ```

4. **Verify backend is running:**
   - You should see: `✅ Backend API server running on http://localhost:3001`
   - Test in browser: `http://localhost:3001/health`
   - Should return: `{"ok":true}`

### Step 2: Frontend Environment Setup

1. **Navigate to frontend folder:**
   ```powershell
   cd zaban2
   ```

2. **Verify `.env.local` exists and contains:**
   ```env
   VITE_API_URL=http://localhost:3001
   ```

3. **If missing, create `.env.local`:**
   ```powershell
   echo "VITE_API_URL=http://localhost:3001" > .env.local
   ```

4. **IMPORTANT:** After creating or modifying `.env.local`, you MUST restart the Vite dev server for changes to take effect.

### Step 3: Start Frontend

1. **Install dependencies (if not already done):**
   ```powershell
   npm install
   ```

2. **Start frontend dev server:**
   ```powershell
   npm run dev
   ```

3. **Frontend will start on:** `http://localhost:3000`

### Step 4: Verify Connection

1. **Open browser:** `http://localhost:3000`

2. **Check for status banner:**
   - 🔵 Blue: "Checking API connection..." (initial)
   - 🟢 Green: "API Connected" (success)
   - 🔴 Red: "API Error: ..." (failure)

3. **Check browser console:**
   - Should see: `✅ API CONNECTED - Backend is reachable and healthy`
   - Or error message with diagnosis

4. **Check Network tab:**
   - Look for `GET /health` request
   - Status should be `200 OK`
   - Response: `{"ok":true}`

## Run Instructions (Two Terminals)

### Terminal 1: Backend
```powershell
cd ..\backend
npm install          # First time only
npm run dev
```

**Expected output:**
```
✅ Backend API server running on http://localhost:3001
   Health check: http://localhost:3001/health
```

### Terminal 2: Frontend
```powershell
cd zaban2
npm install          # First time only
npm run dev          # Make sure .env.local exists first!
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## API Client Usage

The frontend uses a centralized API client at `services/api.ts`. **DO NOT use direct fetch() calls for API requests.**

### Available Methods

```typescript
import { api, getHealth, ApiClientError } from './services/api';

// GET request
const data = await api.get<MyType>('/endpoint');

// POST request
const result = await api.post<ResultType>('/endpoint', { data: 'value' });

// Health check (already integrated in App.tsx)
const health = await getHealth();
```

### Error Handling

```typescript
try {
  const data = await api.get('/endpoint');
} catch (error) {
  if (error instanceof ApiClientError) {
    console.error(`API Error ${error.status}: ${error.message}`);
    // error.details contains additional info
  }
}
```

## Manual Test Checklist

- [ ] Backend server is running (Terminal 1 shows "Backend API server running")
- [ ] Backend `/health` endpoint works (visit `http://localhost:3001/health` in browser)
- [ ] `.env.local` exists in frontend root with `VITE_API_URL=http://localhost:3001`
- [ ] Frontend dev server started successfully (Terminal 2)
- [ ] Browser opened to `http://localhost:3000`
- [ ] Green "API Connected" banner appears at top of page
- [ ] Browser console shows: `✅ API CONNECTED - Backend is reachable and healthy`
- [ ] No CORS errors in console
- [ ] Network tab shows successful `GET /health` request (200 status)

## Common Errors & Fixes

### Error: "VITE_API_URL environment variable is not set"

**Cause:** `.env.local` is missing or variable name is wrong.

**Fix:**
1. Create `.env.local` in frontend root (`zaban2/.env.local`)
2. Add: `VITE_API_URL=http://localhost:3001`
3. **Restart Vite dev server** (stop with Ctrl+C, then `npm run dev` again)

### Error: "Network error: Unable to connect to API"

**Cause:** Backend server is not running or wrong port.

**Fix:**
1. Check Terminal 1 - is backend running?
2. Verify backend is on port 3001 (check console output)
3. Test `http://localhost:3001/health` in browser
4. If backend is on different port, update `.env.local` and restart frontend

### Error: CORS errors in console

**Cause:** Backend CORS not configured correctly.

**Fix:**
1. Check `backend/server.js` has CORS middleware configured
2. Verify it allows `http://localhost:3000`
3. Restart backend server

### Error: "Request timeout after 10000ms"

**Cause:** Backend is slow to respond or not responding.

**Fix:**
1. Check backend server logs for errors
2. Test `/health` endpoint directly in browser
3. Check if backend is stuck or processing something

### Windows-Specific Issues

**Problem:** Port already in use

**Fix:**
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Problem:** Localhost not resolving

**Fix:** Use `127.0.0.1` instead of `localhost`:
```env
VITE_API_URL=http://127.0.0.1:3001
```

## API Client Features

The API client (`services/api.ts`) provides:

- ✅ **Base URL from environment:** Reads `VITE_API_URL` from `.env.local`
- ✅ **10-second timeout:** Automatically cancels slow requests
- ✅ **JSON handling:** Automatic JSON request/response parsing
- ✅ **Error handling:** Structured errors with status codes and messages
- ✅ **TypeScript support:** Fully typed with generics
- ✅ **Self-healing:** Detailed error messages with diagnosis

## Next Steps

1. Add your API endpoints to `backend/server.js`
2. Use `api.get()` and `api.post()` in your frontend code
3. Never use direct `fetch()` for API calls - always use the `api` client
4. Handle `ApiClientError` for user-friendly error messages

## File Structure

### Created/Modified Files

**Backend:**
- `../backend/server.js` - Express server with /health endpoint
- `../backend/package.json` - Backend dependencies
- `../backend/README.md` - Backend documentation

**Frontend:**
- `services/api.ts` - API client (already existed, enhanced)
- `App.tsx` - Health check integration (already existed, enhanced logging)
- `.env.local` - Environment variables (should already exist)

### Key Files

- **API Client:** `services/api.ts`
- **Health Check:** Already integrated in `App.tsx`
- **Backend Server:** `../backend/server.js`
- **Env Config:** `.env.local`

## Support

If you encounter issues:

1. Check both terminal outputs for errors
2. Check browser console for detailed error messages
3. Verify `.env.local` exists and is correct
4. Verify backend is running and accessible
5. Check Network tab for request details

