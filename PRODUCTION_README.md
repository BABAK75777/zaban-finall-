# Production Hardening - Implementation Summary

## ✅ Completed Features

### Backend Hardening

1. **Rate Limiting** ✅
   - Per-IP rate limiting: 30 requests per 5 minutes
   - Per-session concurrency limiting: max 2 active requests per session
   - Returns `RATE_LIMITED` error code (429 status)

2. **Schema Validation** ✅
   - Zod validation for `/tts` endpoint
   - Text: 1-5000 characters, trimmed
   - Path: whitelist characters only, no path traversal
   - Returns `INVALID_REQUEST` error code (400 status)

3. **Timeouts** ✅
   - Gemini API call timeout: 15 seconds
   - Overall request timeout: 20 seconds
   - Returns `TTS_TIMEOUT` error code (504 status)

4. **Security** ✅
   - Helmet middleware for security headers
   - CORS locked down to frontend origin(s)
   - Path traversal protection
   - Payload limits: 256kb JSON body

5. **Observability** ✅
   - Request ID propagation (`X-Request-Id` header)
   - Structured JSON logging with Pino
   - Metrics endpoint: `/metrics`
   - Counters: requests, errors by code, cache hits/misses, Gemini latency

6. **Health Endpoints** ✅
   - `/healthz` - Basic health check
   - `/readyz` - Readiness check (env, filesystem, cache writable)

### Frontend Hardening

1. **Error Handling** ✅
   - Maps backend error codes to user-friendly messages
   - `RATE_LIMITED` → "Rate limit reached. Please wait a moment and try again."
   - `TTS_TIMEOUT` → "Request timed out. Please try again."
   - `TTS_NETWORK_ERROR` → "Connection error. Please check your internet connection."

2. **Request ID Propagation** ✅
   - Generates request IDs for telemetry
   - Attaches `X-Request-Id` header to all TTS requests

## 📦 Dependencies Added

### Backend (`backend/package.json`)
```json
{
  "dependencies": {
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "pino": "^8.17.2",
    "pino-http": "^8.5.0",
    "pino-pretty": "^10.3.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "supertest": "^6.3.3",
    "vitest": "^1.2.0"
  }
}
```

## 🔧 Environment Variables

### Backend
```bash
# Required
GOOGLE_API_KEY=your-api-key-here

# Optional
PORT=3001
LOG_LEVEL=info
NODE_ENV=production
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Frontend
```bash
# Required
VITE_API_URL=http://localhost:3001
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm install
npm test
```

Test coverage:
- ✅ Schema validation (empty text, too long, invalid path)
- ✅ Rate limiting (exceed limit → 429)
- ✅ Timeout handling (slow Gemini → 504)
- ✅ Path traversal protection (`../` → 400)
- ✅ Cache functionality (first miss, second hit)
- ✅ Health endpoints (`/healthz`, `/readyz`)
- ✅ Metrics endpoint (`/metrics`)

### Frontend Tests
```bash
npm install
npm test
```

Test coverage:
- ✅ Rapid click → only one play call
- ✅ Abort mid-play → UI returns to idle
- ✅ Backend error mapping → proper user message
- ✅ Disabled button while loading → true

## 🚀 Deployment Checklist

- [ ] Install dependencies: `cd backend && npm install`
- [ ] Set environment variables (see above)
- [ ] Configure CORS origins in `ALLOWED_ORIGINS`
- [ ] Set `NODE_ENV=production`
- [ ] Verify cache directory is writable
- [ ] Run tests: `npm test`
- [ ] Check health: `curl http://localhost:3001/healthz`
- [ ] Check readiness: `curl http://localhost:3001/readyz`
- [ ] Monitor logs (structured JSON)
- [ ] Check metrics: `curl http://localhost:3001/metrics`

## 📊 Monitoring

### Metrics Endpoint
```bash
curl http://localhost:3001/metrics
```

Returns:
```json
{
  "requests": {
    "total": 1234,
    "byMethod": { "POST": 1000, "GET": 234 },
    "byPath": { "/tts": 1000, "/healthz": 234 }
  },
  "errors": {
    "total": 5,
    "byCode": { "RATE_LIMITED": 2, "TTS_TIMEOUT": 3 }
  },
  "cache": {
    "hits": 500,
    "misses": 500,
    "hitRate": "50.00%"
  },
  "gemini": {
    "calls": 500,
    "avgLatencyMs": 1200
  }
}
```

### Logs
Logs are structured JSON (Pino format):
```json
{
  "level": 30,
  "time": 1234567890,
  "requestId": "abc123",
  "msg": "TTS request received",
  "method": "POST",
  "path": "/tts",
  "ip": "127.0.0.1"
}
```

## 🔒 Security Features

1. **Helmet** - Security headers (X-Content-Type-Options, etc.)
2. **CORS** - Whitelist-only origins
3. **Path Validation** - Prevents `../` traversal
4. **Payload Limits** - 256kb max request body
5. **Rate Limiting** - Prevents abuse
6. **No Secrets in Logs** - API keys are redacted

## 🐛 Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_REQUEST` | 400 | Schema validation failed |
| `EMPTY_TEXT` | 400 | Text is empty or missing |
| `TEXT_TOO_LONG` | 400 | Text exceeds 5000 characters |
| `RATE_LIMITED` | 429 | Too many requests |
| `CONCURRENCY_LIMITED` | 429 | Too many active requests per session |
| `TTS_TIMEOUT` | 504 | Request timed out |
| `TTS_FAILED` | 500 | TTS generation failed |
| `NO_AUDIO_DATA` | 500 | No audio in response |

## 📝 Notes

- Rate limiting uses in-memory storage (resets on server restart)
- For production, consider Redis-backed rate limiting
- Cache directory: `backend/cache/tts/`
- Request IDs are UUIDs or fallback to timestamp-based IDs
- All errors include `requestId` for tracing

---

# Multi-User System - Authentication & Quotas

## ✅ New Features

### Authentication System ✅
- JWT-based authentication with email/password
- Signup, login, logout endpoints
- Token-based session management
- User status management (active/suspended)

### Per-User Quotas ✅
- Free plan: 50,000 chars/day, 200 chunks/day, 20 sessions/day
- Pro plan: 500,000 chars/day, 2,000 chunks/day, 200 sessions/day
- Server-side quota enforcement
- Real-time usage tracking

### Cost Controls ✅
- Max characters per request (5k free, 10k pro)
- Max sessions per hour limits
- Emergency kill switch: `TTS_DISABLED=true`
- Usage metering and tracking

### Secure Cache ✅
- User-isolated cache: `cache/tts/<userId>/<hash>.<format>`
- Users can only access their own cached audio
- Prevents data leakage between users

### Usage Dashboard ✅
- Real-time quota usage display
- Cache hit rate statistics
- Session history and statistics
- Average latency metrics

### Audit Logging ✅
- Login/logout events
- Quota exceeded events
- Unusual traffic patterns
- Admin actions (user suspension)

## 📦 New Dependencies

### Backend
```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3"
  }
}
```

## 🗄️ Database Setup

### PostgreSQL Schema

Run the migration to create tables:
```bash
psql -U postgres -d zaban_tts -f backend/db/schema.sql
```

Tables created:
- `users` - User accounts and plans
- `tts_sessions` - TTS session tracking
- `tts_chunks` - Individual chunk metadata
- `usage_daily` - Daily usage aggregation
- `audit_logs` - Security event logging

## 🔧 New Environment Variables

### Backend
```bash
# Database (Required for multi-user)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zaban_tts
DB_USER=postgres
DB_PASSWORD=your-db-password

# JWT Secret (Required)
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Emergency Kill Switch
TTS_DISABLED=false  # Set to 'true' to disable TTS service

# Optional: Backward compatibility
NODE_ENV=production  # In production, auth is required. In dev, optional.
```

## 🔐 Authentication Endpoints

### POST /auth/signup
Create a new user account.
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### POST /auth/login
Authenticate and get token.
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "plan": "free"
  }
}
```

### GET /auth/me
Get current user info and usage.
Requires: `Authorization: Bearer <token>`

### POST /auth/logout
Logout (client-side token invalidation).

## 📊 Usage Dashboard Endpoint

### GET /usage/dashboard
Get user's usage statistics and quota information.
Requires: `Authorization: Bearer <token>`

Response:
```json
{
  "ok": true,
  "usage": {
    "charsGenerated": 15000,
    "charsLimit": 50000,
    "chunksGenerated": 45,
    "chunksLimit": 200,
    "sessionsToday": 5,
    "sessionsLimit": 20,
    "cacheHitRate": 75.5,
    "avgLatencyMs": 1200
  },
  "plan": "free",
  "quotaLimits": { ... }
}
```

## 🧪 Test Cases

### Test 1: Auth Required ✅
```bash
curl -X POST http://localhost:3001/tts/session
# Expected: 401 UNAUTHORIZED
```

### Test 2: User Isolation ✅
```bash
# User A creates chunk
curl -X GET http://localhost:3001/tts/cache/<hash> \
  -H "Authorization: Bearer <userA_token>"

# User B tries to access User A's chunk
curl -X GET http://localhost:3001/tts/cache/<hash> \
  -H "Authorization: Bearer <userB_token>"
# Expected: 404 CACHE_MISS (cannot access other user's cache)
```

### Test 3: Quota Enforcement ✅
```bash
# Exceed daily character limit
# Expected: 403 QUOTA_EXCEEDED with details
```

### Test 4: Usage Aggregation ✅
- Generate 3 sessions
- Check `/usage/dashboard`
- Verify `usage_daily` table updates correctly

### Test 5: Admin Suspend ✅
```bash
# Suspend user in database
UPDATE users SET status = 'suspended' WHERE email = 'user@example.com';

# User tries to use TTS
curl -X POST http://localhost:3001/tts/session \
  -H "Authorization: Bearer <token>"
# Expected: 403 SUSPENDED
```

## 🚀 Deployment Checklist (Updated)

- [ ] Install dependencies: `cd backend && npm install`
- [ ] Set up PostgreSQL database
- [ ] Run database migrations: `psql -f backend/db/schema.sql`
- [ ] Set environment variables (see above)
- [ ] Set `JWT_SECRET` to a strong random value
- [ ] Set `DB_PASSWORD` securely
- [ ] Configure CORS origins in `ALLOWED_ORIGINS`
- [ ] Set `NODE_ENV=production` (requires auth)
- [ ] Verify cache directory is writable
- [ ] Run tests: `npm test`
- [ ] Check health: `curl http://localhost:3001/health`
- [ ] Test signup: `curl -X POST http://localhost:3001/auth/signup ...`
- [ ] Monitor logs (structured JSON)
- [ ] Check metrics: `curl http://localhost:3001/tts/metrics`

## 🔒 Security Features (Updated)

1. **JWT Authentication** - Secure token-based auth
2. **Password Hashing** - bcrypt with 12 rounds
3. **User Isolation** - Cache and data separated by user
4. **Quota Enforcement** - Server-side limits prevent abuse
5. **Audit Logging** - All security events logged
6. **Suspended Users** - Cannot access service
7. **Emergency Kill Switch** - `TTS_DISABLED=true` disables service

## 🐛 New Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `SUSPENDED` | 403 | Account suspended |
| `QUOTA_EXCEEDED` | 403 | Daily quota limit reached |
| `TEXT_TOO_LONG` | 400 | Text exceeds max chars per request |
| `SERVICE_DISABLED` | 503 | TTS service disabled (kill switch) |

## 📝 Backward Compatibility

- In development (`NODE_ENV !== 'production'`), auth is optional
- Existing endpoints work without auth in dev mode
- In production, all TTS endpoints require authentication
- Cache structure: Old cache still works, new cache is user-specific

