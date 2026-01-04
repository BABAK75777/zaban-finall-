# Guest Mode Setup Guide

This guide explains how to enable guest mode (passwordless authentication) for the app.

## Overview

Guest mode allows the app to run without requiring password-based authentication. This is useful for development or when you want to provide open access to the TTS functionality.

## Frontend Configuration

Create or update `.env.local` in the project root with:

```env
VITE_API_URL=http://localhost:3001
VITE_AUTH_MODE=guest
```

**Options for `VITE_AUTH_MODE`:**
- `guest` - No authentication required, app opens directly
- `jwt` - JWT token authentication (requires login)

## Backend Configuration

Create or update `.env` (or `.env.local`) in the `backend/` directory with:

```env
AUTH_MODE=guest
GOOGLE_API_KEY=your-google-api-key-here
PORT=3001
```

**Options for `AUTH_MODE`:**
- `guest` - No authentication required for TTS endpoints
- `jwt` - JWT token authentication required

## Testing Guest Mode

### Test A: Guest Mode (Fast Setup)

1. **Frontend:** Set `VITE_AUTH_MODE=guest` in `.env.local`
2. **Backend:** Set `AUTH_MODE=guest` in `backend/.env`
3. Start backend: `cd backend && npm run dev`
4. Start frontend: `npm run dev`
5. **Expected:** App opens WITHOUT login screen; TTS works immediately

### Test B: JWT Mode (Standard Auth)

1. **Frontend:** Set `VITE_AUTH_MODE=jwt` in `.env.local`
2. **Backend:** Set `AUTH_MODE=jwt` in `backend/.env`
3. Start both servers
4. **Expected:** App shows login screen (password field will still appear - passwordless OTP not yet implemented)

## Important Notes

- **After changing `.env.local`**, you MUST restart the Vite dev server for changes to take effect
- **After changing backend `.env`**, restart the backend server
- Guest mode bypasses all authentication checks, so use with caution in production
- In guest mode, user quotas and usage tracking are skipped (no user context)

## File Changes Summary

### Frontend (`App.tsx`)
- Checks `VITE_AUTH_MODE` environment variable
- Skips `AuthScreen` when in guest mode
- Hides logout/dashboard buttons in guest mode
- Shows "Guest Mode" label instead of user info

### Backend (`backend/middleware/auth.js`)
- `requireAuth()` and `optionalAuth()` check `AUTH_MODE` environment variable
- When `AUTH_MODE=guest`, middleware allows all requests without JWT validation
- Auth code remains present but is not enforced in guest mode

