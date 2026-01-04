# HTTPS Setup for Shadow Microphone - Step-by-Step Guide

## Root Cause

**Browser Security Rule:** Microphone APIs (`navigator.mediaDevices.getUserMedia()` and `MediaRecorder`) require a **secure context**. Browsers treat `localhost` as a special secure exception, but **plain HTTP over LAN IPs (192.168.x.x) is NOT secure**. The `ERR_SSL_PROTOCOL_ERROR` when accessing `https://192.168.86.190:3000` indicates that Vite is **NOT running in HTTPS mode** - this means certificates are missing or not being loaded correctly.

---

## Implementation Status

✅ **Code is ready:**
- `vite.config.ts` - Configured to auto-detect certificates
- `services/api.ts` - Uses `/api` base in dev mode
- `.gitignore` - Excludes `certs/` directory
- `backend/server.js` - CORS allows HTTPS origins

❌ **Certificates missing:**
- `ERR_SSL_PROTOCOL_ERROR` confirms certificates don't exist yet
- Need to generate certificates with mkcert

---

## Step-by-Step Setup (Windows)

### STEP 1: Install mkcert

**Run ONE of these in Admin PowerShell:**

**Option A: Chocolatey**
```powershell
choco install mkcert
```

**Option B: Winget**
```powershell
winget install FiloSottile.mkcert
```

**Option C: Manual Download**
1. Download from: https://github.com/FiloSottile/mkcert/releases
2. Extract `mkcert-v1.4.4-windows-amd64.exe` to a folder in your PATH
3. Rename to `mkcert.exe`

**Verify installation:**
```powershell
mkcert -version
```

### STEP 2: Install Local CA (one-time)

```powershell
mkcert -install
```

**Expected output:**
```
Created a new local CA at "C:\Users\YourName\AppData\Local\mkcert" 
The local CA is now installed in the system trust store! ⚡
```

### STEP 3: Generate Certificates

```powershell
cd D:\app\zaban\zaban2
mkdir certs

mkcert -key-file certs/localhost+2-key.pem -cert-file certs/localhost+2.pem localhost 127.0.0.1 192.168.86.190
```

**Expected output:**
```
Created a new certificate valid for the following names 📜
 - "localhost"
 - "127.0.0.1"
 - "192.168.86.190"

The certificate is at "certs/localhost+2.pem" and the key at "certs/localhost+2-key.pem" ✅
```

**Important Notes:**
- Replace `192.168.86.190` with your actual LAN IP if different
- If these files do not exist, HTTPS WILL NOT START
- Vite will fall back to HTTP if certificates are missing

### STEP 4: Verify Certificates

```powershell
cd D:\app\zaban\zaban2
dir certs
```

**Expected files:**
```
localhost+2-key.pem
localhost+2.pem
```

### STEP 5: Verify .gitignore

```powershell
cat .gitignore | Select-String "certs"
```

Should show: `certs`

If not present, add it:
```powershell
Add-Content .gitignore "`ncerts"
```

---

## Start Servers

### Terminal 1: Backend
```powershell
cd D:\app\zaban\zaban2\backend
npm run dev
```

**Expected:** Backend running on `http://192.168.86.190:3001`

### Terminal 2: Frontend (HTTPS)
```powershell
cd D:\app\zaban\zaban2
npm run dev
```

**Expected output (AFTER certificates are generated):**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   https://localhost:3000/
➜  Network: https://192.168.86.190:3000/
```

**If you see HTTP URLs instead:**
- Certificates are missing or in wrong location
- Check `certs/` directory exists and contains both `.pem` files
- Restart Vite dev server after generating certificates

---

## Test Checklist

### ✅ Test 1: Desktop (LAN IP)

1. Open `https://192.168.86.190:3000` in browser
2. **Accept certificate warning** (first time only):
   - Click "Advanced" or "Show Details"
   - Click "Proceed to 192.168.86.190 (unsafe)" or similar
3. Browser prompts for microphone permission → **Allow**
4. Click **Shadow** button
5. Recording starts successfully

**Expected Results:**
- ✅ **NO** `ERR_SSL_PROTOCOL_ERROR`
- ✅ **NO** "Microphone API not available" message
- ✅ Console shows: `[SHADOW] Starting recording...`
- ✅ Network tab shows requests to `/api/*` (same origin, HTTPS)

### ✅ Test 2: Phone (LAN IP)

1. On phone browser, open `https://192.168.86.190:3000`
2. **Accept certificate warning**:
   - Tap "Advanced" or "Details"
   - Tap "Proceed to 192.168.86.190" or "Continue"
3. Browser prompts for microphone permission → **Allow**
4. Click **Shadow** button
5. Recording works

### ✅ Test 3: Localhost

1. Open `http://localhost:3000` (or `https://localhost:3000`)
2. Click **Shadow** button
3. Recording works

---

## Troubleshooting

### Issue: ERR_SSL_PROTOCOL_ERROR

**Cause:** Certificates are missing or Vite can't read them.

**Solution:**
1. Check certificates exist: `dir certs` (should show both `.pem` files)
2. Verify file names exactly: `localhost+2-key.pem` and `localhost+2.pem`
3. Check directory is `certs/` (not `.cert/` or `cert/`)
4. Restart Vite dev server after generating certificates
5. Check Vite console output - should show HTTPS URLs

### Issue: Vite still serves HTTP

**Symptoms:**
- Console shows: `➜  Local:   http://localhost:3000/`
- Network tab shows HTTP protocol

**Solution:**
1. Verify certificates exist in `certs/` directory
2. Check file names match exactly (case-sensitive)
3. Restart Vite dev server completely
4. Check Vite console for any certificate loading errors

### Issue: "Certificate not trusted" warning

**Symptoms:**
- Browser shows "Your connection is not private"
- Red lock icon in address bar

**Solution:**
1. Run `mkcert -install` again
2. Restart browser completely
3. Clear browser cache if needed
4. On first visit, click "Advanced" → "Proceed" (expected behavior)

### Issue: "Microphone API not available" still appears

**Symptoms:**
- Error message persists after HTTPS setup

**Solution:**
1. Verify URL is `https://...` (not `http://...`)
2. Check browser address bar shows lock icon (not "Not secure")
3. Check browser permissions: Settings → Site Settings → Microphone → Allow
4. Try incognito/private mode to reset permissions

---

## Verification Commands

**Check certificates exist:**
```powershell
cd D:\app\zaban\zaban2
Test-Path certs/localhost+2-key.pem
Test-Path certs/localhost+2.pem
```

Both should return `True`.

**Check Vite HTTPS status:**
After starting `npm run dev`, check console output:
- ✅ HTTPS: `https://192.168.86.190:3000/`
- ❌ HTTP: `http://192.168.86.190:3000/` (certificates missing)

---

## Summary

**Current Status:**
- ✅ Code implementation: **COMPLETE**
- ❌ Certificates: **MISSING** (causing `ERR_SSL_PROTOCOL_ERROR`)

**Next Steps:**
1. Install mkcert (Step 1)
2. Install local CA (Step 2)
3. Generate certificates (Step 3)
4. Restart Vite dev server
5. Test Shadow on `https://192.168.86.190:3000`

**After certificates are generated:**
- Vite will automatically serve over HTTPS
- `ERR_SSL_PROTOCOL_ERROR` will be resolved
- Shadow will work on LAN IP
- All API calls will be same-origin HTTPS (no mixed-content)

