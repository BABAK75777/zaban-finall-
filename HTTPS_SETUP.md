# HTTPS Setup for Shadow Microphone Access

## Root Cause

The Shadow feature uses `navigator.mediaDevices.getUserMedia()` which requires a **secure context**:
- ✅ Works on: `https://...` or `http://localhost` or `http://127.0.0.1`
- ❌ Blocked on: `http://192.168.86.190:3000` (LAN IP on HTTP)

Browsers block microphone access on non-localhost HTTP origins for security. Additionally, if the frontend is HTTPS and the backend is HTTP, browsers block mixed-content requests.

## Solution

We use **mkcert** to generate trusted local certificates and configure Vite to:
1. Serve the frontend over HTTPS
2. Proxy `/api/*` requests to the HTTP backend (avoiding mixed-content issues)

---

## Step-by-Step Setup (Windows)

### 1. Install mkcert

**Option A: Using Chocolatey (recommended)**
```powershell
choco install mkcert
```

**Option B: Using Scoop**
```powershell
scoop bucket add extras
scoop install mkcert
```

**Option C: Manual download**
1. Download from: https://github.com/FiloSottile/mkcert/releases
2. Extract `mkcert-v1.4.4-windows-amd64.exe` to a folder in your PATH
3. Rename to `mkcert.exe`

### 2. Install Local CA (one-time setup)

```powershell
mkcert -install
```

This installs a local Certificate Authority trusted by your system. You'll see:
```
Created a new local CA at "C:\Users\YourName\AppData\Local\mkcert" 
The local CA is now installed in the system trust store! ⚡
```

### 3. Generate Certificates

Navigate to the project root and create certificates:

```powershell
cd D:\app\zaban\zaban2

# Create certs directory
mkdir certs

# Generate certificate for localhost and your LAN IP
mkcert -key-file certs/localhost+2-key.pem -cert-file certs/localhost+2.pem localhost 127.0.0.1 192.168.86.190
```

**Note:** Replace `192.168.86.190` with your actual LAN IP if different.

You should see:
```
Created a new certificate valid for the following names 📜
 - "localhost"
 - "127.0.0.1"
 - "192.168.86.190"

The certificate is at "certs/localhost+2.pem" and the key at "certs/localhost+2-key.pem" ✅
```

### 4. Verify .gitignore

The `certs/` directory should already be in `.gitignore`. If not, add it:
```powershell
echo "certs/" >> .gitignore
```

---

## How It Works

### Frontend (Vite)
- **HTTPS enabled** on port 3000 when certificates are detected
- **Proxy configured**: `/api/*` → `http://192.168.86.190:3001`
- Accessible at: `https://192.168.86.190:3000` (LAN) or `https://localhost:3000`

### Backend
- **Still runs on HTTP** port 3001 (no changes needed)
- **CORS updated** to allow HTTPS origins
- Receives proxied requests from Vite (target: `http://192.168.86.190:3001`)

### API Client
- **Development mode**: Always uses relative paths `/api/health`, `/api/tts`, etc. (proxied by Vite)
- All API requests go through same-origin proxy (no CORS, no mixed-content)

---

## Testing Checklist

### 1. Start Backend (Terminal 1)
```powershell
cd backend
npm run dev
```

Expected: Backend running on `http://localhost:3001`

### 2. Start Frontend (Terminal 2)
```powershell
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   https://localhost:3000/
➜  Network: https://192.168.86.190:3000/
```

**Note:** If you see HTTP URLs, certificates are missing. Check `.cert/` directory.

### 3. Test on Desktop Browser

1. Open `https://192.168.86.190:3000` (or `https://localhost:3000`)
2. **Accept certificate warning** (first time only - browser will trust it after mkcert CA install)
3. Check console: Should see `[API Base] HTTPS detected - using relative /api paths`
4. Test **Hear AI**: Should work (no mic needed)
5. Test **Shadow**: 
   - Click "Shadow" button
   - **Microphone permission prompt should appear** ✅
   - Grant permission
   - Recording should start ✅

### 4. Test on Phone (Same Network)

1. Find your computer's LAN IP: `ipconfig` (look for IPv4 Address)
2. On phone browser, open `https://192.168.86.190:3000`
3. **Accept certificate warning** (tap "Advanced" → "Proceed")
4. Test **Hear AI** and **Shadow** - both should work ✅

### 5. Verify API Proxy

Open browser DevTools → Network tab:
- Request to `/api/health` should show:
  - **Status**: 200 OK
  - **URL**: `https://192.168.86.190:3000/api/health` (same origin, no CORS)
  - **No mixed-content warnings**

---

## Troubleshooting

### "Certificates not found" / Vite still serves HTTP

**Check:**
1. Certificates exist: `ls certs/` (should show `localhost+2.pem` and `localhost+2-key.pem`)
2. File names match exactly: `localhost+2-key.pem` and `localhost+2.pem`
3. Restart Vite dev server after generating certificates
4. Certificate directory is `certs/` (not `.cert/`)

### "Certificate not trusted" warning

**Solution:**
1. Run `mkcert -install` again
2. Restart browser completely
3. Clear browser cache if needed

### "Mixed Content" errors

**Check:**
1. Frontend is HTTPS (check URL bar)
2. API client is using `/api` paths (check console logs)
3. Vite proxy is working (check Network tab - requests should go to same origin)

### Microphone still blocked

**Check:**
1. URL is `https://...` (not `http://...`)
2. Not using `localhost` or `127.0.0.1`? Those work on HTTP too
3. Browser permissions: Settings → Site Settings → Microphone → Allow
4. Check console for specific error messages

### Backend CORS errors

**Check:**
1. Backend CORS allows HTTPS origins (updated in `server.js`)
2. Backend is running on port 3001
3. Vite proxy target is correct: `http://localhost:3001`

---

## Production Notes

- **mkcert certificates are for development only**
- **Production**: Use proper SSL certificates (Let's Encrypt, etc.)
- **Production API**: Should also be HTTPS or use same-origin proxy

---

## Quick Reference

```powershell
# Generate certificates (one-time, after mkcert install)
mkcert -key-file .cert/localhost+2-key.pem -cert-file .cert/localhost+2.pem localhost 127.0.0.1 192.168.86.190

# Start backend
cd backend && npm run dev

# Start frontend (HTTPS)
npm run dev

# Access URLs
# - Desktop: https://localhost:3000 or https://192.168.86.190:3000
# - Phone: https://192.168.86.190:3000
```

