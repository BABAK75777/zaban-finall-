# Backend API Server

Simple Express.js backend API server for the Zaban app.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm run dev
   # or
   npm start
   ```

3. **Server will start on:** `http://localhost:3001`

## Endpoints

### GET /health
Health check endpoint. Returns:
```json
{
  "ok": true
}
```

### GET /api/status
Status endpoint with timestamp and port info.

## Configuration

- **Port:** Set via `PORT` environment variable (default: `3001`)
- **CORS:** Configured to allow `http://localhost:3000` (frontend)

## Development

The server uses ES modules (`type: "module"` in package.json).

To change the port:
```bash
PORT=3002 npm run dev
```

