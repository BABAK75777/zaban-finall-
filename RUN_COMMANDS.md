# RUN COMMANDS & TEST CHECKLIST

## EXACT COMMANDS (Windows PowerShell)

### Step 1: Install Dependencies
```powershell
# Install root dependencies (includes concurrently)
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Step 2: Start Backend
```powershell
npm run backend
```

**Expected Output:**
```
✅ Backend API server running on http://localhost:3001
   Health check: http://localhost:3001/health
```

**OR if port 3001 is in use:**
```
⚠️  Port 3001 is in use. Trying port 4000...
⚠️  Update .env.local: VITE_API_URL=http://localhost:4000
✅ Backend API server running on http://localhost:4000
   Health check: http://localhost:4000/health
⚠️  IMPORTANT: Update .env.local to: VITE_API_URL=http://localhost:4000
```

### Step 3: Test Backend Health
```powershell
# Test health endpoint (port 3001)
Invoke-WebRequest -Uri "http://localhost:3001/health" | Select-Object -ExpandProperty Content

# OR if backend fell back to port 4000:
Invoke-WebRequest -Uri "http://localhost:4000/health" | Select-Object -ExpandProperty Content
```

**Expected Response:**
```json
{"ok":true}
```

### Step 4: Update .env.local (if backend uses port 4000)
```powershell
# If backend is on port 4000, update .env.local:
"VITE_API_URL=http://localhost:4000`nVITE_API_KEY=<YOUR_KEY>" | Out-File -FilePath ".env.local" -Encoding utf8 -NoNewline
```

### Step 5: Start Frontend
```powershell
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

### Step 6: Start Both Together (Optional)
```powershell
npm run dev:all
```

## TEST CHECKLIST

- [ ] Root dependencies installed: `npm install` completes without errors
- [ ] Backend dependencies installed: `cd backend && npm install` completes without errors
- [ ] `.env.local` exists in project root with:
  - `VITE_API_URL=http://localhost:3001` (or 4000 if fallback)
  - `VITE_API_KEY=<YOUR_KEY>`
- [ ] Backend starts: `npm run backend` shows "✅ Backend API server running"
- [ ] Backend health endpoint works:
  - `Invoke-WebRequest -Uri "http://localhost:3001/health"` returns `{"ok":true}`
  - OR if fallback: `Invoke-WebRequest -Uri "http://localhost:4000/health"` returns `{"ok":true}`
- [ ] If backend runs on port 4000:
  - [ ] `.env.local` updated to `VITE_API_URL=http://localhost:4000`
  - [ ] Vite dev server restarted after updating `.env.local`
- [ ] Frontend starts: `npm run dev` shows "Local: http://localhost:3000/"
- [ ] Browser console shows `ENV CHECK:` once with correct `VITE_API_URL`
- [ ] Browser console shows `✅ API CONNECTED { ok: true }`
- [ ] No "VITE_API_URL environment variable is not set" error in console
- [ ] UI shows green "API Connected" banner at top (not red error banner)
- [ ] No error messages in browser console

## PORT CONFIGURATION

- **Frontend (Vite):** Port 3000 (configured in `vite.config.ts`)
- **Backend (Express):** Port 3001 (default) or 4000 (if 3001 is in use)

## TROUBLESHOOTING

### Backend port conflict
If backend shows "Port 3001 is in use":
1. Backend automatically tries port 4000
2. Update `.env.local`: `VITE_API_URL=http://localhost:4000`
3. Restart Vite dev server

### Frontend can't connect
1. Check backend is running (Terminal 1)
2. Check `.env.local` has correct port
3. Restart Vite dev server after changing `.env.local`
4. Check browser console for error details

