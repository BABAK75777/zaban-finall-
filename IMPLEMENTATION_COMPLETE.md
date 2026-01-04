# IMPLEMENTATION COMPLETE

## 1. FILES EDITED/CREATED

### `.env.local` (Project Root: D:\app\zaban\zaban2\.env.local)
```
VITE_API_URL=http://localhost:3001
VITE_API_KEY=<YOUR_KEY>
```

### `backend/server.js` (Full Content)
```javascript
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - Allow frontend origin
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (REQUIRED)
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Example API endpoint (can be extended)
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// Start server with port conflict handling
const server = app.listen(PORT, () => {
  console.log(`✅ Backend API server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const altPort = PORT === 3001 ? 4000 : PORT + 1;
    console.warn(`⚠️  Port ${PORT} is in use. Trying port ${altPort}...`);
    console.warn(`⚠️  Update .env.local: VITE_API_URL=http://localhost:${altPort}`);
    const altServer = app.listen(altPort, () => {
      console.log(`✅ Backend API server running on http://localhost:${altPort}`);
      console.log(`   Health check: http://localhost:${altPort}/health`);
      console.log(`⚠️  IMPORTANT: Update .env.local to: VITE_API_URL=http://localhost:${altPort}`);
    });
    altServer.on('error', (err2) => {
      console.error(`❌ Failed to start server on port ${altPort}:`, err2.message);
      process.exit(1);
    });
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});
```

### `backend/package.json` (Full Content)
```json
{
  "name": "zaban-backend",
  "version": "1.0.0",
  "type": "module",
  "description": "Backend API server for Zaban app",
  "main": "server.js",
  "scripts": {
    "dev": "node server.js",
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17"
  }
}
```

### `package.json` (Root - Full Content)
```json
{
  "name": "readonly-ai-practice",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "backend": "cd backend && npm run dev",
    "dev:all": "concurrently \"npm run backend\" \"npm run dev\"",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@google/genai": "^1.34.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "concurrently": "^8.2.2",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```

### `services/api.ts` (Modified Function: getBaseUrl)
```typescript
let envCheckLogged = false;

/**
 * Get the base API URL from environment variables
 * 
 * IMPORTANT: After changing .env.local, you MUST restart the Vite dev server
 * for the changes to take effect.
 */
function getBaseUrl(): string {
  // Use optional chaining like the rest of the codebase
  const url = (import.meta as any)?.env?.VITE_API_URL;
  
  // Log ENV CHECK once
  if (!envCheckLogged) {
    console.log('ENV CHECK:', {
      VITE_API_URL: url || 'NOT SET',
      windowOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A'
    });
    envCheckLogged = true;
  }
  
  // If VITE_API_URL is set, use it
  if (url) {
    return url.replace(/\/$/, '');
  }
  
  // Missing env: throw clear error
  const errorMsg = 
    'VITE_API_URL environment variable is not set.\n' +
    'Create .env.local in project root with:\n' +
    'VITE_API_URL=http://localhost:3001\n\n' +
    'After adding it, restart the Vite dev server.';
  console.error('❌', errorMsg);
  throw new Error('VITE_API_URL environment variable is not set. See console for details.');
}
```

### `App.tsx` (Modified Blocks)
```typescript
useEffect(() => {
  // Health check on app start
  const checkHealth = async () => {
    try {
      setApiStatus('checking');
      const response = await getHealth();
      if (response.ok) {
        setApiStatus('connected');
        setApiError(null);
        console.log('✅ API CONNECTED', { ok: true });
      } else {
        setApiStatus('error');
        setApiError('Health check returned unexpected response');
      }
    } catch (error) {
      setApiStatus('error');
      const errorMessage = error instanceof ApiClientError 
        ? error.message 
        : (error instanceof Error ? error.message : 'Failed to connect to API');
      setApiError(errorMessage);
    }
  };

  checkHealth();
}, []);

// Error banner in JSX:
{apiStatus === 'error' && (
  <div className="fixed top-0 left-0 w-full z-[200] bg-red-50 border-b border-red-200 px-6 py-2 flex justify-center items-center gap-3">
    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
    <span className="text-red-800 text-[10px] font-bold uppercase tracking-widest text-center">
      ❌ API Connection Error: {apiError || 'Connection failed'}
    </span>
  </div>
)}
```

## 2. EXACT COMMANDS (Windows PowerShell)

### Install Steps
```powershell
# Install root dependencies (includes concurrently)
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Start Backend
```powershell
npm run backend
```

### Test Backend Health
```powershell
# Test health endpoint
Invoke-WebRequest -Uri "http://localhost:3001/health" | Select-Object -ExpandProperty Content
```

### Start Frontend
```powershell
npm run dev
```

### Start Both (Optional)
```powershell
npm run dev:all
```

## 3. TEST CHECKLIST

- [ ] Root dependencies installed: `npm install` (in project root)
- [ ] Backend dependencies installed: `cd backend && npm install`
- [ ] `.env.local` exists with `VITE_API_URL=http://localhost:3001` and `VITE_API_KEY=<YOUR_KEY>`
- [ ] Backend starts: `npm run backend` (runs on port 3001)
- [ ] `curl http://localhost:3001/health` or `Invoke-WebRequest -Uri "http://localhost:3001/health"` returns `{"ok":true}`
- [ ] If port 3001 is in use, backend automatically tries port 4000
- [ ] If backend runs on 4000, update `.env.local` to `VITE_API_URL=http://localhost:4000`
- [ ] After updating `.env.local`, restart Vite dev server
- [ ] Test fallback port: `curl http://localhost:4000/health` returns `{"ok":true}`
- [ ] Frontend starts: `npm run dev` (runs on port 3000)
- [ ] Browser console shows `ENV CHECK:` once with `VITE_API_URL: http://localhost:3001` (or 4000 if fallback)
- [ ] Browser console shows `✅ API CONNECTED { ok: true }`
- [ ] No "VITE_API_URL environment variable is not set" error in console
- [ ] UI shows green "API Connected" banner (not error banner)
- [ ] No error messages in browser console

## STATUS

✅ **COMPLETE** - All files created/modified, scripts configured, health check implemented.
