# Backend Environment Setup

## OpenRouter (required — single AI provider)

All AI traffic (TTS, chat/OCR) goes through OpenRouter only. No direct OpenAI or Google API keys.

1. **Create `.env` in `backend/`:**

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

Optional:

```bash
OPENROUTER_TTS_MODEL=x-ai/grok-voice-tts-1.0
OPENROUTER_CHAT_MODEL=openai/gpt-4o-mini
OPENROUTER_HTTP_REFERER=https://your-app.example
OPENROUTER_APP_NAME=Zaban TTS
TTS_DEV_FALLBACK_SILENT_WAV=true   # local dev only — silent audio when key missing
```

2. **Restart the server** after changing `.env`.

### Cloud Run (production)

```bash
gcloud secrets create OPENROUTER_API_KEY --replication-policy=automatic
printf '%s' 'sk-or-v1-YOUR-KEY' | gcloud secrets versions add OPENROUTER_API_KEY --data-file=-

gcloud run services update zaban-api --region europe-west1 \
  --update-secrets=OPENROUTER_API_KEY=OPENROUTER_API_KEY:latest \
  --set-env-vars=OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

`API_KEY` is only for `x-api-key` client authentication — not for OpenRouter.

### App auth (production)

```bash
API_KEY=your-app-api-key
JWT_SECRET=your-jwt-secret
```
