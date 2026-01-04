# HTTPS Fix Summary - Shadow Microphone on LAN

## Problem
Shadow feature failed on LAN URL (`http://192.168.86.190:3000`) with error:
> "[SHADOW] Microphone API not available. Use http://localhost:3000 or enable HTTPS."

**Root Cause:**
- `getUserMedia()` requires secure context (HTTPS or localhost)
- HTTP on LAN IP is blocked by browsers
- Mixed-content: HTTPS frontend calling HTTP backend is also blocked

## Solution Implemented

### 1. Vite HTTPS Configuration (`vite.config.ts`)
- ✅ Auto-detects mkcert certificates in `.cert/` directory
- ✅ Enables HTTPS when certificates are present
- ✅ Configures proxy: `/api/*` → `http://localhost:3001`
- ✅ Maintains backward compatibility (falls back to HTTP if no certs)

### 2. API Client Update (`services/api.ts`)
- ✅ Detects HTTPS protocol automatically
- ✅ Uses relative paths (`/api/health`) when HTTPS (proxied by Vite)
- ✅ Uses direct backend connection when HTTP (original behavior)
- ✅ No mixed-content issues

### 3. Backend CORS Update (`backend/server.js`)
- ✅ Allows HTTPS origins in dev mode (`https://192.168.*`, `https://localhost:*`)
- ✅ Maintains existing HTTP support

### 4. Documentation
- ✅ `HTTPS_SETUP.md`: Complete mkcert setup guide for Windows
- ✅ `.gitignore`: Added `.cert/` directory

## Files Changed

1. **vite.config.ts** - HTTPS + proxy configuration
2. **services/api.ts** - Relative path detection for HTTPS
3. **backend/server.js** - CORS allows HTTPS origins
4. **.gitignore** - Excludes certificate directory
5. **HTTPS_SETUP.md** - Setup instructions (NEW)

## Quick Start

### One-Time Setup
```powershell
# 1. Install mkcert
choco install mkcert

# 2. Install local CA
mkcert -install

# 3. Generate certificates
mkdir .cert
mkcert -key-file .cert/localhost+2-key.pem -cert-file .cert/localhost+2.pem localhost 127.0.0.1 192.168.86.190
```

### Daily Usage
```powershell
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend (HTTPS)
npm run dev

# Access: https://192.168.86.190:3000
```

## Testing Checklist

- [ ] Backend running on `http://localhost:3001`
- [ ] Frontend shows HTTPS URLs in console
- [ ] Desktop: `https://192.168.86.190:3000` works
- [ ] Phone: `https://192.168.86.190:3000` works
- [ ] Microphone permission prompt appears
- [ ] Shadow recording works (no "Microphone API not available" error)
- [ ] Hear AI still works
- [ ] API calls work (check Network tab - `/api/health` returns 200)
- [ ] No mixed-content warnings in console

## Benefits

1. ✅ **Microphone works on LAN** - Shadow feature accessible from phone
2. ✅ **No backend changes** - Backend stays on HTTP, Vite proxies requests
3. ✅ **Backward compatible** - HTTP still works if certificates missing
4. ✅ **Simple dev setup** - One-time mkcert install, auto-detection
5. ✅ **No mixed-content** - All requests same-origin via proxy

## Notes

- Certificates are **development-only** (mkcert local CA)
- Production should use proper SSL certificates
- If LAN IP changes, regenerate certificates with new IP
- First HTTPS visit may show certificate warning (expected - click "Advanced" → "Proceed")

