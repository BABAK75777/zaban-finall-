# Quick Start: Fix ERR_SSL_PROTOCOL_ERROR

## Problem

`ERR_SSL_PROTOCOL_ERROR` when accessing `https://192.168.86.190:3000` means **certificates are missing**. Vite is falling back to HTTP mode because it can't find the certificate files.

## Solution: Generate Certificates

### Step 1: Install mkcert (Admin PowerShell)

```powershell
choco install mkcert
# OR
winget install FiloSottile.mkcert
```

### Step 2: Install Local CA (one-time)

```powershell
mkcert -install
```

### Step 3: Generate Certificates

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

### Step 4: Restart Vite Dev Server

```powershell
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

**Expected output (should show HTTPS):**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   https://localhost:3000/
➜  Network: https://192.168.86.190:3000/
```

If you still see HTTP URLs, check:
- `certs/` directory exists
- Both `.pem` files are present
- File names match exactly: `localhost+2-key.pem` and `localhost+2.pem`

### Step 5: Test

1. Open `https://192.168.86.190:3000`
2. Accept certificate warning (first time only)
3. Allow microphone permission
4. Click Shadow → Should work! ✅

---

## Current Status

✅ **Code:** Ready (vite.config.ts configured)  
❌ **Certificates:** Missing (causing ERR_SSL_PROTOCOL_ERROR)  
✅ **Next Step:** Generate certificates (commands above)

After generating certificates, `ERR_SSL_PROTOCOL_ERROR` will be resolved and Shadow will work on LAN IP.

