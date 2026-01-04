# Environment Variables Setup

## Quick Start

1. **Create `.env` file in `backend/` directory:**
   ```bash
   cd backend
   touch .env
   ```

2. **Add your OpenAI API key:**
   ```env
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

3. **Restart the server:**
   ```bash
   npm run dev
   ```

## Available Environment Variables

### OpenAI API Configuration

**Primary (recommended):**
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**OCR-specific (optional, overrides OPENAI_API_KEY for OCR):**
```env
OCR_OPENAI_API_KEY=sk-your-ocr-api-key-here
```

**Legacy fallback (for backward compatibility):**
```env
API_KEY=sk-your-api-key-here
```

**Priority order:**
1. `OPENAI_API_KEY` (checked first)
2. `OCR_OPENAI_API_KEY` (checked second)
3. `API_KEY` (checked third)

### Server Configuration

```env
PORT=3001
NODE_ENV=development
```

### Authentication

```env
# Options: 'guest' (no auth) or 'jwt' (requires database)
AUTH_MODE=guest
```

### Database (required if AUTH_MODE=jwt)

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=zaban_db
```

### CORS (production)

```env
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Verification

After setting up `.env`, verify it's loaded:

```bash
# Check health endpoint
curl http://localhost:3001/health

# Expected response:
# {
#   "ok": true,
#   "ocr": {
#     "enabled": true,
#     "keyConfigured": true
#   }
# }
```

If `keyConfigured: false`, check:
- `.env` file exists in `backend/` directory
- `OPENAI_API_KEY` is set correctly
- Server was restarted after creating `.env`

## Security Notes

- ⚠️ **Never commit `.env` file to git**
- ✅ `.env` is already in `.gitignore`
- ✅ Use `.env.local` for local overrides (also ignored by git)

