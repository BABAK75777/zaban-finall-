// Load environment variables FIRST (before any other imports that might use env vars)
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import OpenAI from 'openai';
import { sessionManager } from './ttsSessionManager.js';
import { chunkText } from './textChunker.js';
import { generateChunkAudio, estimateDurationMs } from './ttsChunkGenerator.js';
import { initDb, dbReady } from './db/index.js';
import { optionalAuth, requireAuth } from './middleware/auth.js';
import { enforceQuota, trackUsage } from './middleware/quotas.js';
import { logAuditEvent } from './middleware/audit.js';
import { query } from './db/index.js';
import authRoutes from './routes/auth.js';
import usageRoutes from './routes/usage.js';
import { getCacheFilePath, cacheExists, readCache, writeCache, getMimeType } from './utils/cache.js';
import { getOpenAIApiKey, isOpenAIApiKeyConfigured } from './utils/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
// In guest mode or dev mode, DB is optional; in production with JWT auth, DB is required
const authMode = process.env.AUTH_MODE || 'guest'; // Default to guest for development
const isGuestMode = authMode === 'guest';

if (process.env.NODE_ENV === 'production' && !isGuestMode) {
  // Production with JWT auth: DB is required
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME || process.env.DB_PASSWORD === undefined) {
    console.error('[DB] ERROR: DB configuration required in production mode with JWT auth. Set DB_HOST, DB_USER, DB_NAME, DB_PASSWORD');
    process.exit(1);
  }
  initDb();
} else {
  // Guest mode or dev mode: try to initialize, but continue if config is missing
  const dbResult = initDb();
  if (!dbResult && isGuestMode) {
    console.log('[DB] DB disabled (dev guest mode). TTS routes will work without database.');
  }
}

// Cache directory setup
const CACHE_DIR = path.join(__dirname, 'cache', 'tts');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  console.log(`[TTS:Cache] Created cache directory: ${CACHE_DIR}`);
}

// OpenAI API key validation at startup (using utility function)
const OPENAI_API_KEY = getOpenAIApiKey();
if (!OPENAI_API_KEY) {
  console.error('[TTS] ERROR: OpenAI API key not found in environment variables');
  console.error('[TTS] Set one of: OPENAI_API_KEY, OCR_OPENAI_API_KEY, or API_KEY');
  console.error('[TTS] In backend/.env or backend/.env.local');
  // Do not crash server - will return error on TTS/OCR requests
} else {
  console.log('[TTS] OpenAI API key found (length:', OPENAI_API_KEY.length, ')');
}

// Initialize OpenAI client (only if key is available)
let openaiClient = null;
if (OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
}

// CORS configuration - Allow frontend origin
const isDev = process.env.NODE_ENV !== 'production';

/**
 * Check if origin is allowed
 * - No origin (e.g., curl, Postman, server-to-server) => allow
 * - Dev mode: allow localhost, 127.0.0.1, and LAN IPs (192.168.*, 10.*)
 * - Production: use explicit allowlist from CORS_ORIGINS env var
 */
const isOriginAllowed = (origin) => {
  // No origin header (e.g., curl, Postman, server-to-server) => allow
  if (!origin) {
    return true;
  }

  if (isDev) {
    // Dev mode: allow localhost, 127.0.0.1, and common LAN IP ranges (both HTTP and HTTPS)
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('https://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('https://127.0.0.1:') ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('https://192.168.') ||
      origin.startsWith('http://10.') ||
      origin.startsWith('https://10.')
    ) {
      return true;
    }
    // Log blocked origins in dev for debugging
    console.log(`[CORS] Blocked origin in dev mode: ${origin}`);
    return false;
  }

  // Production: use explicit allowlist from env
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  return allowedOrigins.includes(origin);
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      const errorMsg = `Not allowed by CORS: ${origin || '(no origin)'}`;
      if (isDev) {
        console.error(`[CORS] ${errorMsg}`);
        console.error(`[CORS] Allowed in dev: localhost, 127.0.0.1, 192.168.*, 10.*`);
      }
      callback(new Error(errorMsg));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'X-Request-Id'],
  optionsSuccessStatus: 204, // Ensure OPTIONS returns 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicitly handle preflight OPTIONS requests for all routes
app.options('*', cors(corsOptions));

// Body parser middleware - Increased limit to 15mb for OCR endpoint (handles large base64 images)
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).send("zaban-api is live ✅");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, service: "zaban-api" });
});

// Healthz endpoint (for Kubernetes health checks)
app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

// Readiness endpoint (checks DB status)
app.get('/readyz', (req, res) => {
  const checks = {
    server: true,
    database: dbReady,
  };
  
  const allReady = Object.values(checks).every(v => v === true);
  const status = allReady ? 200 : 503;
  
  res.status(status).json({
    ok: allReady,
    checks,
  });
});

// Auth routes (no auth required)
app.use('/auth', authRoutes);

// Usage/dashboard routes (auth required)
app.use('/usage', usageRoutes);

// Apply optional auth middleware (required in production, optional in dev)
app.use(optionalAuth);

// Metrics endpoint
app.get('/tts/metrics', (req, res) => {
  res.json({
    ok: true,
    metrics: sessionManager.getMetrics(),
  });
});

// ============================================================================
// STREAMING TTS SESSION ENDPOINTS
// ============================================================================

/**
 * POST /tts/session - Create a new TTS session
 * 
 * Input:
 * {
 *   "text": "... long text ...",
 *   "voiceId": "default",
 *   "format": "mp3",
 *   "chunkMaxChars": 1600
 * }
 * 
 * Output:
 * {
 *   "ok": true,
 *   "sessionId": "sess_abc123",
 *   "totalChunks": 18
 * }
 */
app.post('/tts/session', enforceQuota, async (req, res) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const startTime = Date.now();

  console.log(`[TTS:Session:${requestId}] Creating session:`, {
    body: { ...req.body, text: req.body.text?.substring(0, 100) + '...' },
    timestamp: new Date().toISOString()
  });
  console.log(`[TTS:Session:DIAG:${requestId}] 📥 POST /tts/session request received:`, {
    textLength: req.body.text?.length,
    hasText: !!req.body.text,
    options: {
      voiceId: req.body.voiceId,
      preset: req.body.preset,
      format: req.body.format,
      chunkMaxChars: req.body.chunkMaxChars,
      speed: req.body.speed,
    },
  });

  try {
    // Input validation
    const { text, chunkMaxChars = 1600, speed = 1.0 } = req.body;

    // Phase 6: Fixed values for removed options
    const voiceId = 'en-US-Standard-C';
    const format = 'mp3';

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'EMPTY_TEXT',
        details: 'text field is required and cannot be empty'
      });
    }

    // Create session
    const session = sessionManager.createSession({
      text: text.trim(),
      voiceId,
      format,
      chunkMaxChars,
      speed,
    });

    // Chunk the text
    const chunks = chunkText(text.trim(), chunkMaxChars);
    
    if (chunks.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'NO_CHUNKS',
        details: 'Text could not be chunked'
      });
    }

    sessionManager.setTotalChunks(session.sessionId, chunks.length);

    // Save session to database if user is authenticated
    if (req.user) {
      const sessionKey = crypto.createHash('sha256').update(session.sessionId).digest('hex');
      try {
        await query(
          `INSERT INTO tts_sessions (user_id, session_key, total_chunks, status)
           VALUES ($1, $2, $3, 'active')
           ON CONFLICT (user_id, session_key) DO NOTHING`,
          [req.user.id, sessionKey, chunks.length]
        );
      } catch (dbError) {
        console.error(`[TTS:Session:${session.sessionId}] Failed to save to DB:`, dbError);
        // Continue even if DB save fails
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[TTS:Session:${session.sessionId}] ✅ Session created:`, {
      requestId,
      totalChunks: chunks.length,
      duration: `${duration}ms`,
      userId: req.user?.id || 'anonymous'
    });
    console.log(`[TTS:Session:DIAG:${session.sessionId}] ✅ Session created response:`, {
      sessionId: session.sessionId,
      totalChunks: chunks.length,
      responsePayload: {
        ok: true,
        sessionId: session.sessionId,
        requestId: session.requestId,
        totalChunks: chunks.length,
      },
    });

    res.json({
      ok: true,
      sessionId: session.sessionId,
      requestId: session.requestId,
      totalChunks: chunks.length,
    });

    // Start generating chunks asynchronously (non-blocking)
    console.log(`[TTS:Session:DIAG:${session.sessionId}] 🚀 Starting chunk generation (async):`, {
      totalChunks: chunks.length,
      hasApiKey: !!process.env.GOOGLE_API_KEY,
      options: {
        voiceId,
        preset: 'default',
        format,
        speed,
        pitch: 0.0,
        sampleRate: req.body.sampleRate || 24000,
      },
    });
    generateChunksForSession(session.sessionId, chunks, {
      voiceId,
      preset: req.body.preset || 'default',
      format,
      speed,
      pitch: req.body.pitch || 0.0,
      sampleRate: req.body.sampleRate || 24000,
      apiKey: process.env.GOOGLE_API_KEY,
      userId: req.user?.id, // Pass userId for secure cache
    }).catch(err => {
      console.error(`[TTS:Session:${session.sessionId}] Generation error:`, err);
      console.error(`[TTS:Session:DIAG:${session.sessionId}] ❌ Chunk generation failed:`, {
        error: err.message,
        stack: err.stack,
      });
      sessionManager.updateSessionStatus(session.sessionId, 'error');
    });

  } catch (error) {
    console.error(`[TTS:Session:${requestId}] ❌ Error creating session:`, error);
    res.status(500).json({
      ok: false,
      error: 'SESSION_CREATION_FAILED',
      details: error.message
    });
  }
});

/**
 * GET /tts/session/:sessionId/stream - SSE stream for chunks
 * 
 * Emits events:
 * - meta: { totalChunks, format }
 * - chunk: { index, hash, audioBase64, durationMsEstimate, cacheHit }
 * - progress: { generated, total }
 * - error: { index, error, details }
 * - done: { ok: true }
 */
app.get('/tts/session/:sessionId/stream', (req, res) => {
  const { sessionId } = req.params;
  const session = sessionManager.getSession(sessionId);

  if (!session) {
    return res.status(404).json({
      ok: false,
      error: 'SESSION_NOT_FOUND',
      details: `Session ${sessionId} not found`
    });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Register SSE client
  sessionManager.registerSseClient(sessionId, res);

  console.log(`[TTS:Session:${sessionId}] SSE client connected`);
  console.log(`[TTS:Session:DIAG:${sessionId}] 🔌 SSE client connected:`, {
    sessionId,
    totalChunks: session.totalChunks,
    generatedChunks: session.generatedChunks,
    readyChunks: session.chunks.filter(c => c.status === 'ready').length,
    status: session.status,
  });

  // Send initial meta event
  res.write(`event: meta\n`);
  res.write(`data: ${JSON.stringify({
    totalChunks: session.totalChunks,
    format: session.options.format,
    voiceId: session.options.voiceId,
  })}\n\n`);

  // Send any already-generated chunks
  for (const chunk of session.chunks) {
    if (chunk.status === 'ready' && chunk.audioBase64) {
      res.write(`event: chunk\n`);
      res.write(`data: ${JSON.stringify({
        index: chunk.index,
        hash: chunk.hash,
        audioBase64: chunk.audioBase64,
        durationMsEstimate: chunk.durationMsEstimate,
        cacheHit: chunk.cacheHit || false,
        latencyMs: chunk.latencyMs,
      })}\n\n`);
    } else if (chunk.status === 'error') {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({
        index: chunk.index,
        error: chunk.error || 'TTS_FAILED',
        details: 'Chunk generation failed',
      })}\n\n`);
    }
  }

  // Send progress
  res.write(`event: progress\n`);
  res.write(`data: ${JSON.stringify({
    generated: session.generatedChunks,
    total: session.totalChunks,
  })}\n\n`);

  // Send done if completed
  if (session.status === 'completed') {
    res.write(`event: done\n`);
    res.write(`data: ${JSON.stringify({ ok: true })}\n\n`);
  }

  // Keep connection alive with periodic heartbeats
  const heartbeatInterval = setInterval(() => {
    if (session.status === 'cancelled' || !session.sseClients.has(res)) {
      clearInterval(heartbeatInterval);
      return;
    }
    try {
      res.write(`: heartbeat\n\n`);
    } catch (err) {
      clearInterval(heartbeatInterval);
      sessionManager.unregisterSseClient(sessionId, res);
    }
  }, 30000); // Every 30 seconds

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    sessionManager.unregisterSseClient(sessionId, res);
    console.log(`[TTS:Session:${sessionId}] SSE client disconnected`);
  });
});

/**
 * POST /tts/session/:sessionId/cancel - Cancel a session
 */
app.post('/tts/session/:sessionId/cancel', (req, res) => {
  const { sessionId } = req.params;
  
  const cancelled = sessionManager.cancelSession(sessionId);
  
  if (cancelled) {
    res.json({
      ok: true,
      message: 'Session cancelled'
    });
  } else {
    res.status(404).json({
      ok: false,
      error: 'SESSION_NOT_FOUND',
      details: `Session ${sessionId} not found`
    });
  }
});

/**
 * GET /tts/session/:sessionId/chunk/:index - Fetch a specific chunk (mobile fallback)
 * 
 * Returns chunk audio as binary or base64 JSON
 */
app.get('/tts/session/:sessionId/chunk/:index', async (req, res) => {
  const { sessionId, index } = req.params;
  const chunkIndex = parseInt(index, 10);
  const asBase64 = req.query.format === 'json' || req.query.base64 === 'true';
  
  const session = sessionManager.getSession(sessionId);
  
  if (!session) {
    return res.status(404).json({
      ok: false,
      error: 'SESSION_NOT_FOUND',
      details: `Session ${sessionId} not found`
    });
  }
  
  const chunk = session.chunks.find(c => c.index === chunkIndex);
  
  if (!chunk) {
    return res.status(404).json({
      ok: false,
      error: 'CHUNK_NOT_FOUND',
      details: `Chunk ${chunkIndex} not found in session ${sessionId}`
    });
  }
  
  if (chunk.status === 'error') {
    return res.status(500).json({
      ok: false,
      error: 'CHUNK_ERROR',
      details: chunk.error || 'Chunk generation failed'
    });
  }
  
  if (!chunk.audioBase64) {
    return res.status(202).json({
      ok: false,
      error: 'CHUNK_PENDING',
      details: `Chunk ${chunkIndex} is still being generated`
    });
  }
  
  try {
    // Decode base64 to buffer
    const audioBuffer = Buffer.from(chunk.audioBase64, 'base64');
    const format = session.options.format || 'mp3';
    const mimeType = getMimeTypeForFormat(format);
    
    if (asBase64) {
      // Return as JSON with base64
      res.setHeader('Content-Type', 'application/json');
      res.json({
        ok: true,
        index: chunkIndex,
        hash: chunk.hash,
        audioBase64: chunk.audioBase64,
        format,
        durationMsEstimate: chunk.durationMsEstimate,
        cacheHit: chunk.cacheHit || false,
      });
    } else {
      // Return as binary
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('X-Chunk-Index', chunkIndex.toString());
      res.setHeader('X-Chunk-Hash', chunk.hash);
      res.send(audioBuffer);
    }
  } catch (error) {
    console.error(`[TTS:Session:${sessionId}] Error serving chunk ${chunkIndex}:`, error);
    res.status(500).json({
      ok: false,
      error: 'CHUNK_SERVE_ERROR',
      details: error.message
    });
  }
});

/**
 * POST /tts/session/:sessionId/export - Export entire session as merged audio file
 * 
 * Merges all chunks into a single audio file (MP3 recommended)
 */
app.post('/tts/session/:sessionId/export', async (req, res) => {
  const { sessionId } = req.params;
  const { format = 'mp3' } = req.body;
  
  const session = sessionManager.getSession(sessionId);
  
  if (!session) {
    return res.status(404).json({
      ok: false,
      error: 'SESSION_NOT_FOUND',
      details: `Session ${sessionId} not found`
    });
  }
  
  // Check if all chunks are ready
  const readyChunks = session.chunks.filter(c => c.status === 'ready' && c.audioBase64);
  const totalChunks = session.totalChunks;
  
  if (readyChunks.length === 0) {
    return res.status(202).json({
      ok: false,
      error: 'NO_CHUNKS_READY',
      details: 'No chunks are ready yet. Please wait for generation to complete.',
      generated: session.generatedChunks,
      total: totalChunks
    });
  }
  
  if (readyChunks.length < totalChunks && session.status !== 'completed') {
    return res.status(202).json({
      ok: false,
      error: 'CHUNKS_INCOMPLETE',
      details: `Only ${readyChunks.length} of ${totalChunks} chunks are ready`,
      generated: readyChunks.length,
      total: totalChunks
    });
  }
  
  try {
    // Sort chunks by index
    readyChunks.sort((a, b) => a.index - b.index);
    
    // For now, we'll concatenate the base64 audio data
    // In production, you might want to use ffmpeg to properly merge audio files
    // This is a simple concatenation approach
    const audioBuffers = readyChunks.map(chunk => {
      return Buffer.from(chunk.audioBase64, 'base64');
    });
    
    // Concatenate buffers
    const mergedBuffer = Buffer.concat(audioBuffers);
    
    // Note: This simple concatenation works for MP3 but may not work perfectly for all formats
    // For production, consider using ffmpeg or a proper audio library
    const mimeType = getMimeTypeForFormat(format);
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `tts-session-${sessionId}-${timestamp}.${format}`;
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', mergedBuffer.length);
    res.setHeader('X-Session-Id', sessionId);
    res.setHeader('X-Total-Chunks', totalChunks.toString());
    
    res.send(mergedBuffer);
    
    console.log(`[TTS:Session:${sessionId}] ✅ Exported session: ${filename} (${mergedBuffer.length} bytes)`);
  } catch (error) {
    console.error(`[TTS:Session:${sessionId}] ❌ Export error:`, error);
    res.status(500).json({
      ok: false,
      error: 'EXPORT_FAILED',
      details: error.message
    });
  }
});

/**
 * Generate chunks for a session (async, non-blocking)
 */
async function generateChunksForSession(sessionId, chunks, options) {
  const session = sessionManager.getSession(sessionId);
  if (!session) {
    return;
  }

  const { voiceId, format, speed, apiKey } = options;
  const abortController = new AbortController();
  session.abortController = abortController;

  if (!apiKey) {
    console.error(`[TTS:Session:${sessionId}] No API key configured`);
    sessionManager.updateSessionStatus(sessionId, 'error');
    return;
  }

  console.log(`[TTS:Session:${sessionId}] Starting chunk generation:`, {
    totalChunks: chunks.length,
    requestId: session.requestId
  });
  console.log(`[TTS:Session:DIAG:${sessionId}] 🚀 generateChunksForSession starting:`, {
    totalChunks: chunks.length,
    hasApiKey: !!apiKey,
    sessionStatus: session.status,
  });

  // Generate chunks sequentially (can be parallelized later)
  for (let i = 0; i < chunks.length; i++) {
    // Check if cancelled
    if (abortController.signal.aborted || session.status === 'cancelled') {
      console.log(`[TTS:Session:${sessionId}] Generation cancelled at chunk ${i}`);
      console.log(`[TTS:Session:DIAG:${sessionId}] ⏹️  Generation cancelled at chunk ${i}:`, {
        aborted: abortController.signal.aborted,
        sessionStatus: session.status,
      });
      return;
    }

    const chunkText = chunks[i];
    const chunkStartTime = Date.now();

    console.log(`[TTS:Session:DIAG:${sessionId}] 📦 Generating chunk ${i + 1}/${chunks.length}:`, {
      chunkIndex: i,
      chunkTextLength: chunkText.length,
      chunkTextPreview: chunkText.substring(0, 50),
    });

    try {
      const result = await generateChunkAudio({
        text: chunkText,
        voiceId,
        preset: options.preset || 'default',
        speed,
        pitch: options.pitch || 0.0,
        format,
        sampleRate: options.sampleRate || 24000,
        apiKey,
        abortSignal: abortController.signal,
        maxRetries: 3,
      });

      const durationEstimate = estimateDurationMs(chunkText, speed);

      console.log(`[TTS:Session:DIAG:${sessionId}] ✅ Chunk ${i} generated:`, {
        index: i,
        hasAudioBase64: !!result.audioBase64,
        audioBase64Length: result.audioBase64?.length,
        hash: result.hash,
        cacheHit: result.cacheHit,
        latencyMs: result.latencyMs,
      });

      // Add chunk to session
      sessionManager.addChunk(sessionId, {
        index: i,
        hash: result.hash,
        audioBase64: result.audioBase64,
        cacheHit: result.cacheHit,
        latencyMs: result.latencyMs,
        durationMsEstimate: durationEstimate,
      });

      const currentSession = sessionManager.getSession(sessionId);
      console.log(`[TTS:Session:DIAG:${sessionId}] 📊 After addChunk:`, {
        generatedChunks: currentSession?.generatedChunks,
        totalChunks: currentSession?.totalChunks,
        sseClientCount: currentSession?.sseClients?.size || 0,
      });

      // Broadcast to all SSE clients
      for (const res of session.sseClients) {
        try {
          res.write(`event: chunk\n`);
          res.write(`data: ${JSON.stringify({
            index: i,
            hash: result.hash,
            audioBase64: result.audioBase64,
            durationMsEstimate: durationEstimate,
            cacheHit: result.cacheHit,
            latencyMs: result.latencyMs,
          })}\n\n`);
          console.log(`[TTS:Session:DIAG:${sessionId}] 📤 Chunk ${i} event sent to SSE client`);
        } catch (err) {
          console.error(`[TTS:Session:DIAG:${sessionId}] ❌ Failed to send chunk ${i} to SSE client:`, err);
          // Client disconnected, will be cleaned up
        }
      }

      // Send progress update
      const updatedSession = sessionManager.getSession(sessionId);
      console.log(`[TTS:Session:DIAG:${sessionId}] 📊 Sending progress update:`, {
        generated: updatedSession.generatedChunks,
        total: updatedSession.totalChunks,
        sseClientCount: updatedSession.sseClients?.size || 0,
      });
      for (const res of updatedSession.sseClients) {
        try {
          res.write(`event: progress\n`);
          res.write(`data: ${JSON.stringify({
            generated: updatedSession.generatedChunks,
            total: updatedSession.totalChunks,
          })}\n\n`);
          console.log(`[TTS:Session:DIAG:${sessionId}] 📤 Progress event sent to SSE client:`, {
            generated: updatedSession.generatedChunks,
            total: updatedSession.totalChunks,
          });
        } catch (err) {
          console.error(`[TTS:Session:DIAG:${sessionId}] ❌ Failed to send progress to SSE client:`, err);
          // Client disconnected
        }
      }

      console.log(`[TTS:Session:${sessionId}] ✅ Chunk ${i + 1}/${chunks.length} generated:`, {
        cacheHit: result.cacheHit,
        latencyMs: result.latencyMs,
        requestId: session.requestId,
      });

    } catch (error) {
      console.error(`[TTS:Session:${sessionId}] ❌ Chunk ${i} failed:`, error);
      console.error(`[TTS:Session:DIAG:${sessionId}] ❌ Chunk ${i} generation error:`, {
        error: error.message,
        stack: error.stack,
        chunkIndex: i,
      });

      // Add error chunk
      sessionManager.addChunk(sessionId, {
        index: i,
        hash: '',
        error: error.message || 'TTS_FAILED',
      });

      // Broadcast error to SSE clients
      for (const res of session.sseClients) {
        try {
          res.write(`event: error\n`);
          res.write(`data: ${JSON.stringify({
            index: i,
            error: 'TTS_FAILED',
            details: error.message,
          })}\n\n`);
        } catch (err) {
          // Client disconnected
        }
      }

      // Continue with next chunk (non-fatal)
    }
  }

  // Mark session as completed
  const finalSession = sessionManager.getSession(sessionId);
  if (finalSession && finalSession.status === 'active') {
    sessionManager.updateSessionStatus(sessionId, 'completed');

    // Send done event
    for (const res of finalSession.sseClients) {
      try {
        res.write(`event: done\n`);
        res.write(`data: ${JSON.stringify({ ok: true })}\n\n`);
      } catch (err) {
        // Client disconnected
      }
    }

    console.log(`[TTS:Session:${sessionId}] ✅ All chunks generated`);
  }
}

// Cache lookup endpoint (optional, for direct cache access)
// SECURE: Only allows access to user's own cache
app.get('/tts/cache/:hash', async (req, res) => {
  const hash = req.params.hash;
  
  // Require authentication for cache access
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      error: 'UNAUTHORIZED',
      details: 'Authentication required to access cache'
    });
  }

  // Try different formats
  const formats = ['mp3', 'wav', 'ogg'];
  for (const format of formats) {
    if (cacheExists(req.user.id, hash, format)) {
      const audioBuffer = readCache(req.user.id, hash, format);
      const mimeType = getMimeType(format);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('X-Cache-Hit', 'true');
      return res.send(audioBuffer);
    }
  }

  res.status(404).json({
    ok: false,
    error: 'CACHE_MISS',
    details: `Audio not found in cache for hash: ${hash}`
  });
});

// Example API endpoint (can be extended)
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// Helper function to compute hash for cache key (includes all parameters)
// Phase 6: computeHash uses fixed values for removed options
function computeHash(text, speed = 1.0, sampleRate = 24000) {
  const normalized = text.trim().replace(/\s+/g, ' ').replace(/\n+/g, '\n');
  // Phase 6: Fixed values for voiceId, preset, pitch, format
  const voiceId = 'en-US-Standard-C';
  const preset = 'default';
  const pitch = 0.0;
  const format = 'mp3';
  // Include all parameters that affect audio output
  const hashInput = `${normalized}|${voiceId}|${preset}|${speed}|${pitch}|${format}|${sampleRate}`;
  return crypto.createHash('sha1').update(hashInput).digest('hex');
}

// Helper function to get legacy cache file path (for backward compatibility, no userId)
function getLegacyCacheFilePath(hash, format = 'mp3') {
  return path.join(CACHE_DIR, `${hash}.${format}`);
}

// Helper function to get MIME type for format
function getMimeTypeForFormat(format) {
  const mimeTypes = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg'
  };
  return mimeTypes[format.toLowerCase()] || 'audio/mpeg';
}

// Helper function to check and return cached audio buffer (for JSON response)
function getCachedAudioBuffer(hash, format = 'mp3') {
  // Try to find cached file with any supported extension
  const formats = [format, 'mp3', 'wav', 'ogg'];
  for (const fmt of formats) {
    const cachePath = getLegacyCacheFilePath(hash, fmt);
    if (fs.existsSync(cachePath)) {
      const audioBuffer = fs.readFileSync(cachePath);
      console.log(`[TTS:Cache] Found cached audio: ${hash}.${fmt} (${audioBuffer.length} bytes)`);
      return { buffer: audioBuffer, format: fmt };
    }
  }
  return null;
}

// Helper function to save audio to cache
function saveToCache(hash, audioBuffer, format = 'mp3') {
  try {
    const cachePath = getLegacyCacheFilePath(hash, format);
    fs.writeFileSync(cachePath, audioBuffer);
    console.log(`[TTS:Cache] Saved audio to cache: ${hash}.${format} (${audioBuffer.length} bytes)`);
  } catch (error) {
    console.warn(`[TTS:Cache] Failed to save cache: ${error.message}`);
  }
}

// Simple audio normalization - basic RMS-based loudness leveling
// This is a pragmatic implementation. For production, consider using a dedicated library.
function normalizeAudioLoudness(audioBuffer) {
  try {
    // For PCM audio, we'd analyze samples. For compressed formats (mp3/ogg),
    // we return as-is since normalization would require decoding/re-encoding.
    // The normalization is mainly useful for WAV files or if we decode all formats.
    
    // For now, return buffer as-is (normalization can be added via ffmpeg if needed)
    // TODO: Add proper loudness normalization using ffmpeg or audio processing library
    return audioBuffer;
  } catch (error) {
    console.warn(`[TTS:Normalize] Failed to normalize audio: ${error.message}`);
    return audioBuffer; // Return original on error
  }
}

// PHASE 2: Dev fallback - Generate silent WAV file
// Creates a valid PCM WAV file with silence (0.5s, 16-bit, 22050Hz, mono)
function generateSilentWav() {
  // WAV file structure:
  // - RIFF header (12 bytes)
  // - fmt chunk (24 bytes)
  // - data chunk header (8 bytes)
  // - PCM data (samples)
  
  const sampleRate = 22050;
  const bitsPerSample = 16;
  const numChannels = 1; // mono
  const durationSeconds = 0.5;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const fileSize = 36 + dataSize; // 12 (RIFF) + 24 (fmt) + 8 (data header) + dataSize
  
  const buffer = Buffer.alloc(fileSize);
  let offset = 0;
  
  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize - 8, offset); offset += 4; // File size - 8
  buffer.write('WAVE', offset); offset += 4;
  
  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // fmt chunk size
  buffer.writeUInt16LE(1, offset); offset += 2; // Audio format (1 = PCM)
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), offset); offset += 4; // Byte rate
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), offset); offset += 2; // Block align
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;
  
  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;
  
  // PCM data (silence = all zeros, already initialized by Buffer.alloc)
  // Buffer is already zero-filled, so we don't need to write anything
  
  return buffer;
}

// Phase 6: Voice catalog endpoint removed

// TTS endpoint with comprehensive error handling and validation
app.post('/tts', async (req, res) => {
  // Log fallback env at handler start
  console.log("[TTS] fallback env =", process.env.TTS_DEV_FALLBACK_SILENT_WAV);
  
  // Phase 1: Proof that request reaches backend
  if (process.env.NODE_ENV !== 'production') {
    console.log('[TTS] hit');
  }
  
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const startTime = Date.now();
  
  // Helper function to return fallback if enabled
  const returnFallbackIfEnabled = () => {
    if (process.env.TTS_DEV_FALLBACK_SILENT_WAV === "true") {
      console.log("[TTS] Using silent wav fallback");
      try {
        const buf = generateSilentWav();
        const audioBase64 = buf.toString("base64");
        res.setHeader('Content-Type', 'application/json');
        const response = res.status(200).json({ ok:true, audioBase64: audioBase64, mimeType:"audio/wav" });
        console.log("[TTS] /tts returning JSON, base64_len=", audioBase64?.length, "mime=", "audio/wav");
        return response;
      } catch (fallbackError) {
        console.error(`[TTS:${requestId}] Dev fallback also failed:`, fallbackError);
        return null; // Return null to continue to error
      }
    }
    return null;
  };
  
  // PHASE 0: Diagnostic logging
  console.log(`[TTS:${requestId}] ===== DIAGNOSTIC START =====`);
  console.log(`[TTS:${requestId}] Request ID:`, requestId);
  console.log(`[TTS:${requestId}] req.body keys:`, req.body ? Object.keys(req.body) : 'req.body is null/undefined');
  console.log(`[TTS:${requestId}] req.body.text type:`, typeof req.body?.text);
  console.log(`[TTS:${requestId}] req.body.text length:`, typeof req.body?.text === 'string' ? req.body.text.length : 'N/A');
  console.log(`[TTS:${requestId}] req.body.text value (first 50 chars):`, typeof req.body?.text === 'string' ? req.body.text.substring(0, 50) : req.body?.text);
  
  // Log incoming request
  console.log(`[TTS:${requestId}] Incoming request:`, {
    body: req.body,
    headers: req.headers['content-type'],
    timestamp: new Date().toISOString()
  });

  try {
    // PHASE 1: Robust request body validation
    // Ensure req.body exists
    if (!req.body || typeof req.body !== 'object') {
      console.error(`[TTS:${requestId}] req.body is invalid:`, typeof req.body);
      return res.status(400).json({
        ok: false,
        error: 'INVALID_REQUEST',
        debugId: requestId,
        details: 'Request body is missing or invalid. Ensure Content-Type: application/json'
      });
    }

    // 1️⃣ INPUT VALIDATION
    // PHASE 1: Validate text first (most critical)
    const text = req.body?.text;
    if (text === undefined || text === null) {
      console.error(`[TTS:${requestId}] Validation failed: text is missing`);
      return res.status(400).json({
        ok: false,
        error: 'EMPTY_TEXT',
        debugId: requestId,
        details: 'text field is required in request body'
      });
    }

    if (typeof text !== 'string') {
      console.error(`[TTS:${requestId}] Validation failed: text is not a string`, { type: typeof text, value: text });
      return res.status(400).json({
        ok: false,
        error: 'INVALID_TEXT_TYPE',
        debugId: requestId,
        details: `text must be a string, got ${typeof text}`
      });
    }

    // Validate text is not empty or whitespace-only
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      console.error(`[TTS:${requestId}] Validation failed: text is empty or whitespace-only`);
      return res.status(400).json({
        ok: false,
        error: 'EMPTY_TEXT',
        debugId: requestId,
        details: 'text cannot be empty or contain only whitespace'
      });
    }

    // Extract other optional parameters
    const { 
      path: pathParam, 
      hash: hashParam, 
      speed = 1.0,
      sampleRate = 24000
    } = req.body;
    
    // Phase 6: Fixed values for removed options
    const voiceId = 'en-US-Standard-C';
    const preset = 'default';
    const pitch = 0.0;
    const format = 'mp3';
    
    // Validate and reject unknown keys (strict mode for new API) - only if hash provided
    const allowedKeys = ['text', 'path', 'hash', 'speed', 'sampleRate'];
    const unknownKeys = Object.keys(req.body).filter(key => !allowedKeys.includes(key));
    if (unknownKeys.length > 0 && hashParam) {
      // Only enforce strict mode when hash is provided (new API usage)
      return res.status(400).json({
        ok: false,
        error: 'INVALID_REQUEST',
        debugId: requestId,
        details: `Unknown keys not allowed: ${unknownKeys.join(', ')}`,
        allowedKeys
      });
    }

    // Validate max length (5k chars as specified)
    const MAX_TEXT_LENGTH = 5000;
    if (trimmedText.length > MAX_TEXT_LENGTH) {
      console.error(`[TTS:${requestId}] Validation failed: text too long`, { 
        length: trimmedText.length, 
        max: MAX_TEXT_LENGTH 
      });
      return res.status(400).json({
        ok: false,
        error: 'TEXT_TOO_LONG',
        details: `text length (${trimmedText.length}) exceeds maximum (${MAX_TEXT_LENGTH} characters)`
      });
    }

    // Validate path if provided (optional but should be string if present)
    if (pathParam !== undefined && pathParam !== null && typeof pathParam !== 'string') {
      console.warn(`[TTS:${requestId}] Invalid path type, ignoring`, { type: typeof pathParam });
    }
    
    // Phase 6: Fixed values - no validation needed
    const normalizedFormat = format.toLowerCase();
    
    // Validate speed (0.5 - 1.5)
    if (typeof speed !== 'number' || isNaN(speed) || speed < 0.5 || speed > 1.5) {
      return res.status(400).json({
        ok: false,
        error: 'SPEED_OUT_OF_RANGE',
        details: 'speed must be a number between 0.5 and 1.5',
        received: speed
      });
    }
    
    // Validate sampleRate
    const validSampleRates = [16000, 22050, 24000, 44100, 48000];
    if (typeof sampleRate !== 'number' || !validSampleRates.includes(sampleRate)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_SAMPLE_RATE',
        details: `sampleRate must be one of: ${validSampleRates.join(', ')}`,
        received: sampleRate
      });
    }

    // 2️⃣ CACHE LOOKUP (if hash provided or compute from text with all parameters)
    // Phase 6: computeHash only takes speed and sampleRate (other params are fixed)
    const cacheHash = hashParam || computeHash(trimmedText, speed, sampleRate);
    
    // Use secure user-specific cache if authenticated
    let cachedBuffer = null;
    let cachedFormat = normalizedFormat;
    if (req.user) {
      const formats = [normalizedFormat, 'mp3', 'wav', 'ogg'];
      for (const fmt of formats) {
        if (cacheExists(req.user.id, cacheHash, fmt)) {
          cachedBuffer = readCache(req.user.id, cacheHash, fmt);
          cachedFormat = fmt;
          break;
        }
      }
    } else {
      // Fallback to old cache for backward compatibility
      const cachedResult = getCachedAudioBuffer(cacheHash, normalizedFormat);
      if (cachedResult) {
        cachedBuffer = cachedResult.buffer;
        cachedFormat = cachedResult.format;
      }
    }
    
    // Handle cache hit
    if (cachedBuffer) {
      const duration = Date.now() - startTime;
      console.log(`[TTS:${requestId}] ✅ Cache hit:`, {
        hash: cacheHash,
        format: cachedFormat,
        duration: `${duration}ms`,
        userId: req.user?.id || 'anonymous',
        timestamp: new Date().toISOString()
      });
      
      // Track usage (cache hit) for authenticated users
      if (req.user && req.quotaInfo) {
        const words = trimmedText.trim().split(/\s+/).length;
        const wordsPerMinute = 150 * speed;
        const minutes = words / wordsPerMinute;
        const secondsAudioEst = Math.round(minutes * 60);
        
        trackUsage(req.user.id, {
          charsGenerated: trimmedText.length,
          chunksGenerated: 1,
          secondsAudioEst,
          requests: 1,
          cacheHits: 1,
          cacheMisses: 0,
        }).catch(err => console.error('[TTS] Failed to track usage:', err));
      }
      
      // Validate cached buffer
      if (!Buffer.isBuffer(cachedBuffer)) {
        console.error(`[TTS:${requestId}] Cached buffer is not a Buffer:`, typeof cachedBuffer);
        // Fall through to generate new audio
      } else if (cachedBuffer.length === 0) {
        console.error(`[TTS:${requestId}] Cached buffer is empty`);
        // Fall through to generate new audio
      } else {
        // Return cached audio
        const words = trimmedText.trim().split(/\s+/).length;
        const wordsPerMinute = 150 * speed;
        const minutes = words / wordsPerMinute;
        const durationMsEstimate = Math.round(minutes * 60 * 1000);
        const mimeType = getMimeTypeForFormat(cachedFormat);
        
        res.setHeader('Content-Type', 'application/json');
        const audioBase64 = cachedBuffer.toString('base64');
        const response = res.json({
          ok: true,
          audioBase64: audioBase64,
          mimeType: mimeType,
          durationMsEstimate: durationMsEstimate
        });
        console.log("[TTS] /tts returning JSON, base64_len=", audioBase64?.length, "mime=", mimeType);
        return response;
      }
    }

    console.log(`[TTS:${requestId}] Cache miss, generating audio:`, {
      textLength: trimmedText.length,
      path: pathParam || 'not provided',
      hash: cacheHash,
      textPreview: trimmedText.substring(0, 50) + (trimmedText.length > 50 ? '...' : '')
    });

    // 3️⃣ API KEY VALIDATION AT RUNTIME
    if (!openaiClient) {
      const errorMsg = 'OPENAI_API_KEY environment variable is not set or is empty';
      console.error(`[TTS:${requestId}] ${errorMsg}`);
      console.error(`[TTS:${requestId}] Check backend/.env or backend/.env.local for OPENAI_API_KEY`);
      const fallbackResponse = returnFallbackIfEnabled();
      if (fallbackResponse) return fallbackResponse;
      return res.status(500).json({
        ok: false,
        error: 'PROVIDER_ERROR',
        debugId: requestId,
        details: 'API key not configured. Check server logs for details.'
      });
    }

    console.log(`[TTS:${requestId}] Using OpenAI TTS:`, {
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      format: 'wav',
      textLength: trimmedText.length
    });

    // 4️⃣ OPENAI TTS API REQUEST
    let audioBuffer = null;
    try {
      if (!openaiClient) {
        throw new Error('OpenAI client not initialized');
      }

      const response = await openaiClient.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        input: trimmedText,
        response_format: 'wav',
      });

      // OpenAI returns audio as ArrayBuffer/ReadableStream
      if (!response) {
        throw new Error('OpenAI response is null or undefined');
      }

      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer) {
        throw new Error('OpenAI arrayBuffer is null or undefined');
      }

      audioBuffer = Buffer.from(arrayBuffer);
      
      // Validate audioBuffer
      if (!Buffer.isBuffer(audioBuffer)) {
        throw new Error(`audioBuffer is not a Buffer, got: ${typeof audioBuffer}`);
      }

      console.log(`[TTS:${requestId}] OpenAI TTS response:`, {
        bufferLength: audioBuffer.length,
        isValid: audioBuffer.length > 0,
        bufferType: Buffer.isBuffer(audioBuffer) ? 'Buffer' : typeof audioBuffer
      });

      if (audioBuffer.length === 0) {
        console.error(`[TTS:${requestId}] Empty audio buffer from OpenAI`);
        const fallbackResponse = returnFallbackIfEnabled();
        if (fallbackResponse) return fallbackResponse;
        return res.status(500).json({
          ok: false,
          error: 'PROVIDER_ERROR',
          debugId: requestId,
          details: 'OpenAI TTS returned empty audio. Check server logs for details.'
        });
      }
    } catch (openaiError) {
      const errorStack = openaiError.stack || 'No stack trace';
      const errorMessage = openaiError.message || 'Unknown error';
      console.error(`[TTS:${requestId}] OpenAI TTS API error:`, {
        message: errorMessage,
        name: openaiError.name || 'Error',
        stack: errorStack,
        status: openaiError.status,
        code: openaiError.code,
        fullError: openaiError
      });
      
      // PHASE 2: Dev fallback to silent WAV if enabled
      if (process.env.TTS_DEV_FALLBACK_SILENT_WAV === "true") {
        console.log("[TTS] Using silent wav fallback");
        const buf = generateSilentWav();
        const audioBase64 = buf.toString("base64");
        res.setHeader('Content-Type', 'application/json');
        const response = res.status(200).json({ ok:true, audioBase64: audioBase64, mimeType:"audio/wav" });
        console.log("[TTS] /tts returning JSON, base64_len=", audioBase64?.length, "mime=", "audio/wav");
        return response;
      }
      
      return res.status(500).json({
        ok: false,
        error: 'PROVIDER_ERROR',
        debugId: requestId,
        details: `OpenAI TTS error: ${errorMessage}`
      });
    }

    // Validate audioBuffer before proceeding
    if (!audioBuffer || !Buffer.isBuffer(audioBuffer)) {
      console.error(`[TTS:${requestId}] audioBuffer validation failed:`, {
        isNull: audioBuffer === null,
        isUndefined: audioBuffer === undefined,
        type: typeof audioBuffer,
        isBuffer: Buffer.isBuffer(audioBuffer)
      });
      const fallbackResponse = returnFallbackIfEnabled();
      if (fallbackResponse) return fallbackResponse;
      return res.status(500).json({
        ok: false,
        error: 'TTS_FAILED',
        debugId: requestId,
        details: 'Audio buffer is invalid after OpenAI call. Check server logs for details.'
      });
    }

    if (audioBuffer.length === 0) {
      console.error(`[TTS:${requestId}] audioBuffer is empty after validation`);
      const fallbackResponse = returnFallbackIfEnabled();
      if (fallbackResponse) return fallbackResponse;
      return res.status(500).json({
        ok: false,
        error: 'TTS_FAILED',
        debugId: requestId,
        details: 'Audio buffer is empty after OpenAI call. Check server logs for details.'
      });
    }

    // 8️⃣.5️⃣ AUDIO NORMALIZATION (optional - simple RMS-based normalization)
    // This is a basic implementation. For production, consider using a library like loudness-normalizer
    const normalizedBuffer = normalizeAudioLoudness(audioBuffer);
    
    // Validate normalizedBuffer
    if (!normalizedBuffer || !Buffer.isBuffer(normalizedBuffer)) {
      console.error(`[TTS:${requestId}] normalizedBuffer validation failed:`, {
        isNull: normalizedBuffer === null,
        isUndefined: normalizedBuffer === undefined,
        type: typeof normalizedBuffer,
        isBuffer: Buffer.isBuffer(normalizedBuffer)
      });
      const fallbackResponse = returnFallbackIfEnabled();
      if (fallbackResponse) return fallbackResponse;
      return res.status(500).json({
        ok: false,
        error: 'TTS_FAILED',
        debugId: requestId,
        details: 'Normalized buffer is invalid. Check server logs for details.'
      });
    }

    if (normalizedBuffer.length === 0) {
      console.error(`[TTS:${requestId}] normalizedBuffer is empty`);
      const fallbackResponse = returnFallbackIfEnabled();
      if (fallbackResponse) return fallbackResponse;
      return res.status(500).json({
        ok: false,
        error: 'TTS_FAILED',
        debugId: requestId,
        details: 'Normalized buffer is empty. Check server logs for details.'
      });
    }
    
    // Estimate duration (rough: ~150 words per minute adjusted by speed)
    const words = trimmedText.trim().split(/\s+/).length;
    const wordsPerMinute = 150 * speed;
    const minutes = words / wordsPerMinute;
    const durationMsEstimate = Math.round(minutes * 60 * 1000);

    // 9️⃣ SAVE TO CACHE AND SEND SUCCESS RESPONSE
    // OpenAI always returns WAV format
    const openaiFormat = 'wav';
    const cacheExtension = openaiFormat;
    
    // Save to user-specific cache if authenticated
    if (req.user) {
      writeCache(req.user.id, cacheHash, openaiFormat, normalizedBuffer);
      
      // Save chunk to database
      try {
        const sessionKey = req.body.sessionId ? crypto.createHash('sha256').update(req.body.sessionId).digest('hex') : null;
        if (sessionKey) {
          const sessionResult = await query(
            `SELECT id FROM tts_sessions WHERE user_id = $1 AND session_key = $2`,
            [req.user.id, sessionKey]
          );
          const sessionId = sessionResult.rows[0]?.id;
          
          if (sessionId) {
            await query(
              `INSERT INTO tts_chunks (user_id, session_id, chunk_hash, format, bytes, cache_hit, gemini_latency_ms)
               VALUES ($1, $2, $3, $4, $5, false, $6)
               ON CONFLICT DO NOTHING`,
              [req.user.id, sessionId, cacheHash, openaiFormat, normalizedBuffer.length, Date.now() - startTime]
            );
          }
        }
      } catch (dbError) {
        console.error(`[TTS:${requestId}] Failed to save chunk to DB:`, dbError);
      }
      
      // Track usage (cache miss - OpenAI call)
      if (req.quotaInfo) {
        const words = trimmedText.trim().split(/\s+/).length;
        const wordsPerMinute = 150 * speed;
        const minutes = words / wordsPerMinute;
        const secondsAudioEst = Math.round(minutes * 60);
        
        trackUsage(req.user.id, {
          charsGenerated: trimmedText.length,
          chunksGenerated: 1,
          secondsAudioEst,
          requests: 1,
          cacheHits: 0,
          cacheMisses: 1,
        }).catch(err => console.error('[TTS] Failed to track usage:', err));
      }
    } else {
      // Fallback to old cache for backward compatibility
      saveToCache(cacheHash, normalizedBuffer, cacheExtension);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[TTS:${requestId}] ✅ Success:`, {
      duration: `${duration}ms`,
      textLength: trimmedText.length,
      audioSize: normalizedBuffer.length,
      hash: cacheHash,
      format: openaiFormat,
      voiceId,
      preset,
      speed,
      pitch,
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    });

    // Return JSON with: { ok: true, audioBase64: string, mimeType: "audio/wav" }
    // Validate base64 conversion
    let audioBase64;
    try {
      audioBase64 = normalizedBuffer.toString('base64');
      if (!audioBase64 || typeof audioBase64 !== 'string') {
        throw new Error(`audioBase64 is invalid: ${typeof audioBase64}`);
      }
      if (audioBase64.length < 100) {
        console.warn(`[TTS:${requestId}] audioBase64 seems too short: ${audioBase64.length} chars`);
      }
    } catch (base64Error) {
      console.error(`[TTS:${requestId}] Failed to convert buffer to base64:`, {
        error: base64Error.message,
        stack: base64Error.stack,
        bufferLength: normalizedBuffer.length,
        bufferType: typeof normalizedBuffer
      });
      const fallbackResponse = returnFallbackIfEnabled();
      if (fallbackResponse) return fallbackResponse;
      return res.status(500).json({
        ok: false,
        error: 'TTS_FAILED',
        debugId: requestId,
        details: 'Failed to encode audio to base64. Check server logs for details.'
      });
    }

    res.setHeader('Content-Type', 'application/json');
    const response = res.status(200).json({
      ok: true,
      audioBase64: audioBase64,
      mimeType: 'audio/wav'
    });
    console.log("[TTS] /tts returning JSON, base64_len=", audioBase64?.length, "mime=", 'audio/wav');
    return response;

  } catch (error) {
    // 🔟 CATCH ALL UNEXPECTED ERRORS
    const duration = Date.now() - startTime;
    
    // PHASE 0: Full error logging with stack
    console.error(`[TTS:${requestId}] ===== ERROR CAPTURED =====`);
    console.error(`[TTS:${requestId}] Error message:`, error?.message || 'No message');
    console.error(`[TTS:${requestId}] Error name:`, error?.name || 'No name');
    console.error(`[TTS:${requestId}] Error stack:`, error?.stack || 'No stack trace');
    console.error(`[TTS:${requestId}] Full error object:`, error);
    
    const errorDetails = {
      message: error?.message || 'Unknown error occurred',
      name: error?.name || 'Error',
      stack: error?.stack || 'No stack trace available',
      requestId,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };

    console.error(`[TTS:${requestId}] ❌ Unexpected error:`, errorDetails);
    console.error(`[TTS:${requestId}] Error full object:`, error);

    // Check fallback before returning 500
    if (process.env.TTS_DEV_FALLBACK_SILENT_WAV === "true") {
      console.log("[TTS] Using silent wav fallback");
      const buf = generateSilentWav();
      const audioBase64 = buf.toString("base64");
      res.setHeader('Content-Type', 'application/json');
      const response = res.status(200).json({ ok:true, audioBase64: audioBase64, mimeType:"audio/wav" });
      console.log("[TTS] /tts returning JSON, base64_len=", audioBase64?.length, "mime=", "audio/wav");
      return response;
    }

    // Ensure server does NOT crash
    return res.status(500).json({
      ok: false,
      error: 'TTS_FAILED',
      debugId: requestId,
      details: `Unexpected error: ${error?.message || 'Unknown error'}. Check server logs for full details.`
    });
  }
});

// ============================================================================
// OCR ENDPOINT
// ============================================================================

/**
 * POST /ocr - Extract text from image using OpenAI Vision
 * 
 * Input (JSON):
 * {
 *   "image": "data:image/png;base64,..." or base64 string
 * }
 * 
 * Output:
 * {
 *   "ok": true,
 *   "text": "extracted text..."
 * }
 * or
 * {
 *   "ok": false,
 *   "error": "ERROR_CODE",
 *   "debugId": "..."
 * }
 */
app.post('/ocr', async (req, res) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const startTime = Date.now();

  console.log(`[OCR:${requestId}] Request received`);

  try {
    // 1️⃣ VALIDATE OPENAI API KEY (Fail Fast)
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      const errorMsg = 'OpenAI API key not configured. Set OPENAI_API_KEY, OCR_OPENAI_API_KEY, or API_KEY in environment variables.';
      console.error(`[OCR:${requestId}] ${errorMsg}`);
      return res.status(500).json({
        ok: false,
        error: 'API_KEY_MISSING',
        debugId: requestId,
        details: 'OpenAI API key not configured.'
      });
    }
    
    // Ensure OpenAI client is initialized
    if (!openaiClient) {
      openaiClient = new OpenAI({ apiKey });
    }

    // 2️⃣ VALIDATE INPUT
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_INPUT',
        debugId: requestId,
        details: 'image field is required and must be a string (base64 or data URL)'
      });
    }

    // 3️⃣ EXTRACT BASE64 FROM DATA URL IF NEEDED
    let base64Data = image;
    let mimeType = 'image/png'; // default
    
    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1] || 'image/png';
        base64Data = matches[2];
      } else {
        // Try to extract base64 even if format is slightly different
        const base64Match = image.match(/base64,(.+)$/);
        if (base64Match) {
          base64Data = base64Match[1];
        }
      }
    }

    if (!base64Data || base64Data.length < 100) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_IMAGE',
        debugId: requestId,
        details: 'Image data is too short or invalid'
      });
    }

    console.log(`[OCR:${requestId}] Processing image:`, {
      mimeType,
      base64Length: base64Data.length,
      estimatedSizeKB: Math.round(base64Data.length * 0.75 / 1024)
    });

    // 4️⃣ CALL OPENAI VISION API
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o', // or 'gpt-4o-mini' for faster/cheaper
      messages: [
        {
          role: 'system',
          content: 'Extract all readable text exactly. Preserve line breaks. No extra commentary.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            }
          ]
        }
      ],
      max_tokens: 4096
    });

    // 5️⃣ EXTRACT TEXT FROM RESPONSE
    const extractedText = response.choices?.[0]?.message?.content || '';
    
    if (!extractedText || extractedText.trim().length === 0) {
      console.warn(`[OCR:${requestId}] No text extracted from image`);
      return res.status(200).json({
        ok: true,
        text: '',
        warning: 'No text found in image'
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[OCR:${requestId}] ✅ Text extracted:`, {
      textLength: extractedText.length,
      duration: `${duration}ms`
    });

    // 6️⃣ RETURN SUCCESS
    return res.status(200).json({
      ok: true,
      text: extractedText.trim()
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error?.message || 'Unknown error';
    const errorStack = error?.stack || 'No stack trace';
    
    console.error(`[OCR:${requestId}] ❌ Error:`, {
      message: errorMessage,
      name: error?.name || 'Error',
      status: error?.status,
      code: error?.code,
      duration: `${duration}ms`,
      stack: errorStack
    });

    // Handle specific OpenAI errors
    if (error?.status === 401) {
      return res.status(500).json({
        ok: false,
        error: 'API_KEY_INVALID',
        debugId: requestId,
        details: 'OpenAI API key is invalid or expired'
      });
    }

    if (error?.status === 429) {
      return res.status(429).json({
        ok: false,
        error: 'RATE_LIMIT',
        debugId: requestId,
        details: 'OpenAI API rate limit exceeded. Please try again later.'
      });
    }

    // Generic error
    return res.status(500).json({
      ok: false,
      error: 'OCR_FAILED',
      debugId: requestId,
      details: `OCR processing failed: ${errorMessage}. Check server logs for full details.`
    });
  }
});

// ============================================================================
// SHADOW ENDPOINT (User Audio Analysis/Transcription)
// ============================================================================

/**
 * POST /shadow - Analyze user-recorded audio
 * 
 * Input (JSON):
 * {
 *   "audio": "base64_encoded_audio_data",
 *   "mimeType": "audio/webm" or "audio/wav"
 * }
 * 
 * Output:
 * {
 *   "ok": true,
 *   "transcript": "transcribed text...",
 *   "score": 0.85
 * }
 * or
 * {
 *   "ok": false,
 *   "error": "ERROR_CODE",
 *   "debugId": "..."
 * }
 */
app.post('/shadow', async (req, res) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const startTime = Date.now();

  console.log(`[Shadow:${requestId}] Request received`);

  try {
    // 1️⃣ VALIDATE INPUT
    const { audio, mimeType } = req.body;
    if (!audio || typeof audio !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_INPUT',
        debugId: requestId,
        details: 'audio field is required and must be a base64 string'
      });
    }

    if (!audio || audio.length < 100) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_AUDIO',
        debugId: requestId,
        details: 'Audio data is too short or invalid'
      });
    }

    console.log(`[Shadow:${requestId}] Processing audio:`, {
      mimeType: mimeType || 'audio/webm',
      base64Length: audio.length,
      estimatedSizeKB: Math.round(audio.length * 0.75 / 1024)
    });

    // 2️⃣ DECODE BASE64 AUDIO
    let audioBuffer;
    try {
      audioBuffer = Buffer.from(audio, 'base64');
      if (audioBuffer.length === 0) {
        throw new Error('Decoded audio buffer is empty');
      }
    } catch (decodeErr) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_BASE64',
        debugId: requestId,
        details: 'Failed to decode base64 audio data'
      });
    }

    // 3️⃣ BASIC VALIDATION (check if it's a valid audio file)
    // For now, we'll just acknowledge receipt and return success
    // In the future, this could call OpenAI Whisper or another transcription service
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const duration = Date.now() - startTime;
    console.log(`[Shadow:${requestId}] ✅ Audio processed:`, {
      audioSize: audioBuffer.length,
      duration: `${duration}ms`
    });

    // 4️⃣ RETURN SUCCESS (with placeholder transcript/score)
    // TODO: Integrate with actual transcription service (OpenAI Whisper, etc.)
    return res.status(200).json({
      ok: true,
      transcript: '[Transcription service not yet integrated]',
      score: 0.85,
      audioSize: audioBuffer.length,
      message: 'Audio received successfully. Transcription service integration pending.'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error?.message || 'Unknown error';
    const errorStack = error?.stack || 'No stack trace';
    
    console.error(`[Shadow:${requestId}] ❌ Error:`, {
      message: errorMessage,
      name: error?.name || 'Error',
      duration: `${duration}ms`,
      stack: errorStack
    });

    // Generic error
    return res.status(500).json({
      ok: false,
      error: 'SHADOW_FAILED',
      debugId: requestId,
      details: `Shadow processing failed: ${errorMessage}. Check server logs for full details.`
    });
  }
});

// Start server with port conflict handling
// Listen on 0.0.0.0 to allow connections from LAN (mobile devices)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend API server running on http://0.0.0.0:${PORT} (accessible from LAN)`);
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   ⚠️  Windows Firewall: Ensure port ${PORT} TCP inbound is allowed`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const altPort = PORT === 3001 ? 4000 : PORT + 1;
    console.warn(`⚠️  Port ${PORT} is in use. Trying port ${altPort}...`);
    console.warn(`⚠️  Note: In dev mode, frontend auto-detects API port from window.location`);
    // Listen on 0.0.0.0 for LAN access
    const altServer = app.listen(altPort, '0.0.0.0', () => {
      console.log(`✅ Backend API server running on http://0.0.0.0:${altPort} (accessible from LAN)`);
      console.log(`   Local: http://localhost:${altPort}`);
      console.log(`   Health check: http://localhost:${altPort}/health`);
      console.log(`   ⚠️  Windows Firewall: Ensure port ${altPort} TCP inbound is allowed`);
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

