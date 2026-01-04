# Guest Mode - Quick Start Commands

## Exact PowerShell Commands

### Step 1: Update .env.local (Required)
```powershell
# Navigate to project root
cd D:\app\zaban\zaban2

# Add VITE_AUTH_MODE=guest to .env.local (if file exists)
Add-Content -Path .env.local -Value "`nVITE_AUTH_MODE=guest"

# Verify contents
Get-Content .env.local
```

**Expected output:**
```
VITE_API_URL=http://localhost:3001
VITE_AUTH_MODE=guest
```

### Step 2: Start Backend
```powershell
# Navigate to backend
cd backend

# Start backend server
npm run dev
```

**Expected output:**
```
[DB] DB disabled (missing env vars: DB_HOST, DB_USER, DB_NAME, DB_PASSWORD). Running in no-db mode.
[TTS:Cache] Created cache directory: ...
✅ Backend API server running on http://localhost:3001
   Health check: http://localhost:3001/health
```

### Step 3: Start Frontend (New Terminal)
```powershell
# Navigate to project root
cd D:\app\zaban\zaban2

# Start frontend dev server
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:3000/
```

---

## Quick Smoke Tests

### Test 1: Backend Health Check
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/healthz" | Select-Object -ExpandProperty Content
```

**Expected:** `{"ok":true}`

### Test 2: Backend TTS Endpoint (requires GOOGLE_API_KEY)
```powershell
$body = @{ text = "Hello world" } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3001/tts" -Method POST -Body $body -ContentType "application/json" | Select-Object StatusCode, Content
```

**Expected:** StatusCode: 200 (or 500 if API key missing, but no auth error)

### Test 3: Frontend Opens Without Login
1. Open browser: `http://localhost:3000`
2. Should see main app immediately (no sign-in screen)
3. Should see "Guest Mode" in navigation bar
4. Should see green "API Connected" banner

---

## All Changes Summary

✅ Frontend defaults to guest mode (no auth screen)  
✅ Backend defaults to guest mode (no JWT required)  
✅ Password field removed from AuthScreen  
✅ DB optional in guest mode (backend starts without DB)  
✅ TTS routes work without authentication  
✅ Dashboard returns 503 in guest mode (expected)  

See `GUEST_MODE_IMPLEMENTATION.md` for full details.

