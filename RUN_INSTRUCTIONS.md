# Run Instructions

## Quick Start (Two Terminals)

### Terminal 1: Backend Server

```powershell
cd backend
npm install
npm run dev
```

**Expected Output:**
```
✅ Backend API server running on http://localhost:3001
   Health check: http://localhost:3001/health
```

### Terminal 2: Frontend Dev Server

```powershell
# Make sure you're in project root (zaban2 folder)
npm install
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

## Ports

- **Frontend (Vite):** Port 3000
- **Backend (Express):** Port 3001

## Environment Variables

The `.env.local` file in the project root contains:
```
VITE_API_URL=http://localhost:3001
```

**Important:** After modifying `.env.local`, restart the Vite dev server.

## Verify Connection

1. Open browser: `http://localhost:3000`
2. Check for green "API Connected" banner at top
3. Check console for: `✅ API CONNECTED - Backend is reachable and healthy`

## Testing Health Endpoint

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/health"
```

**Browser:**
```
http://localhost:3001/health
```

**Expected Response:**
```json
{"ok":true}
```

