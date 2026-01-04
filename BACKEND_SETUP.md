# Backend API Setup Guide

This document explains how to configure your backend to work with the frontend API client.

## Frontend Configuration

The frontend is configured to connect to your backend API via the `VITE_API_URL` environment variable in `.env.local`:

```env
VITE_API_URL=http://localhost:3001
```

**Important:** After changing `.env.local`, restart your Vite dev server for changes to take effect.

## Backend CORS Configuration

Since the frontend runs on a different port (typically `http://localhost:3000`) than your backend, you need to configure CORS (Cross-Origin Resource Sharing) on your backend.

### Express.js / Node.js

Install the `cors` package:

```bash
npm install cors
npm install --save-dev @types/cors  # if using TypeScript
```

Configure CORS in your Express app:

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Allow requests from frontend origin
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Add your production frontend URL here when deploying
  ],
  credentials: true, // If you need to send cookies/credentials
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Your routes...
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
```

### FastAPI / Python

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # Add your production frontend URL here when deploying
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"ok": True}
```

### Other Frameworks

For other backend frameworks, ensure you:
1. Allow requests from `http://localhost:3000` (your Vite dev server)
2. Handle preflight OPTIONS requests
3. Include appropriate CORS headers:
   - `Access-Control-Allow-Origin: http://localhost:3000`
   - `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`
   - `Access-Control-Allow-Headers: Content-Type, Authorization`

## Required Backend Endpoint

Your backend **must** implement a health check endpoint:

### Endpoint: `GET /health`

**Response:**
```json
{
  "ok": true
}
```

**Status Code:** `200 OK`

**Example implementations:**

#### Express.js
```javascript
app.get('/health', (req, res) => {
  res.json({ ok: true });
});
```

#### FastAPI
```python
@app.get("/health")
async def health_check():
    return {"ok": True}
```

## Network Configuration for Mobile Devices (Expo React Native)

If you're using Expo React Native and testing on a physical device:

1. **Find your machine's local IP address:**
   - **Windows:** Run `ipconfig` in PowerShell/Command Prompt, look for "IPv4 Address" under your active network adapter
   - **macOS/Linux:** Run `ifconfig` or `ip addr`, look for your local IP (typically 192.168.x.x or 10.0.x.x)

2. **Update `.env.local`:**
   ```env
   VITE_API_URL=http://192.168.1.100:3001
   ```
   Replace `192.168.1.100` with your actual IP address.

3. **Ensure your backend allows connections from your network:**
   - Bind to `0.0.0.0` instead of `localhost`:
     ```javascript
     // Express
     app.listen(3001, '0.0.0.0', () => {
       console.log('Server running on all interfaces');
     });
     ```

4. **Update CORS to allow your device's origin** (if needed)

## Testing the Connection

1. Start your backend server
2. Start the frontend dev server (`npm run dev`)
3. Check the browser console and the status banner at the top of the page
4. You should see "API Connected" in green if the connection is successful

## Production Deployment

For production:

1. Update `VITE_API_URL` in your build environment to your production API URL
2. Update CORS configuration on your backend to allow your production frontend domain
3. Consider using environment-specific configuration files

