# TTS Streaming Buffering Issue - Diagnosis

## Problem Summary
When user clicks "Read / Hear AI", the UI shows "BUFFERING… 0/1" and never progresses. Audio never plays.

## Root Cause Analysis

### Symptoms
- UI shows: `Buffering... 0/1` (generatedChunks=0, totalChunks=1)
- NEXT button stays disabled (expected, but user reports it should enable)
- No audio playback
- No visible errors in UI

### Flow Analysis

1. **Frontend Flow:**
   - User clicks "Read / Hear AI" → `handleHearAI()` called
   - Calls `streamingTtsOrchestrator.startSession(text, options, progressCallback)`
   - `startSession()`:
     - POST `/tts/session` → gets `{ sessionId, totalChunks }`
     - Calls `connectToStream()` → GET `/tts/session/:sessionId/stream`
     - Creates EventSource, listens for: 'meta', 'chunk', 'progress', 'error', 'done'
   - Progress callback updates `streamingProgress` state
   - UI reads `streamingProgress.generatedChunks / streamingProgress.totalChunks`

2. **Backend Flow:**
   - POST `/tts/session`:
     - Creates session via `sessionManager.createSession()`
     - Chunks text
     - Returns `{ sessionId, totalChunks }`
     - Starts `generateChunksForSession()` asynchronously
   - GET `/tts/session/:sessionId/stream`:
     - Sets SSE headers
     - Sends initial 'meta' event
     - Sends any ready chunks
     - Sends initial 'progress' event
     - Registers SSE client for future broadcasts
   - `generateChunksForSession()`:
     - Generates chunks sequentially
     - Calls `sessionManager.addChunk()` for each
     - Broadcasts 'chunk' event to all SSE clients
     - Broadcasts 'progress' event after each chunk

### Potential Issues Identified

1. **SSE Connection Issues:**
   - EventSource might fail to connect (network/CORS)
   - EventSource.onerror might not be handled correctly
   - Connection might close before chunks arrive

2. **Chunk Generation Stalls:**
   - `generateChunksForSession()` might fail silently (no error handling in async catch)
   - API key might be missing (returns early, no error sent to client)
   - First chunk generation might hang or timeout

3. **Event Parsing Issues:**
   - Frontend might not receive 'chunk' events
   - Frontend might not parse events correctly
   - Progress events might use wrong field names

4. **Race Condition:**
   - SSE connects before chunk generation starts
   - Initial progress event sent with `generatedChunks=0`, but no updates follow
   - Chunk generation might complete but events not broadcast

5. **State Management:**
   - `isBuffering` calculation: `state === 'buffering' && !this.chunks.has(this.nextToPlayIndex)`
   - If chunk 0 never arrives, `isBuffering` stays true forever
   - `playNextChunk()` only called if chunk exists, so never transitions to 'playing'

### Most Likely Root Causes (in order)

1. **Chunk generation fails silently** - `generateChunksForSession()` error not propagated to SSE clients
2. **SSE events not received** - EventSource.onerror fires but not handled, or connection closes
3. **Progress updates missing** - `generatedChunks` counter not incremented correctly
4. **Chunk data missing** - Chunk generated but `audioBase64` is empty/null

## Diagnostic Logging Plan

### Frontend Logging Points

1. **handleHearAI entry:**
   - Log: text length, options summary (no secrets)
   - Log: before/after `startSession()` call

2. **streamingTtsOrchestrator.startSession:**
   - Log: session creation request URL
   - Log: response status and payload (sessionId, totalChunks)
   - Log: SSE connection URL
   - Log: EventSource state changes (onopen, onerror)

3. **SSE Event Handlers:**
   - Log: each event received (meta, chunk, progress, error, done)
   - Log: parsed data shape (keys present)
   - Log: state transitions (connecting → buffering → playing)

4. **Progress Callback:**
   - Log: every progress update with full state:
     - state, currentChunk, totalChunks, generatedChunks, bufferedChunks, isBuffering

5. **Error Handling:**
   - Log: any errors in catch blocks
   - Log: EventSource errors with details

### Backend Logging Points

1. **POST /tts/session:**
   - Log: request received (text length, options summary)
   - Log: session created (sessionId, totalChunks)
   - Log: chunk generation start (total chunks)

2. **GET /tts/session/:sessionId/stream:**
   - Log: SSE client connected (sessionId)
   - Log: initial events sent (meta, progress counts)
   - Log: client disconnect

3. **generateChunksForSession:**
   - Log: start of generation
   - Log: each chunk generation start/end
   - Log: chunk added to session
   - Log: SSE broadcast sent (chunk index, client count)
   - Log: progress broadcast sent (generated, total)
   - Log: any errors during generation

4. **sessionManager methods:**
   - Log: addChunk calls (index, status)
   - Log: generatedChunks counter updates

## Files to Modify

1. `components/ReadingScreen.tsx`
   - Add logging in `handleHearAI` (around line 490-515)
   - Add logging in progress callback (around line 503-514)

2. `services/streamingTtsOrchestrator.ts`
   - Add logging in `startSession` (around line 85-173)
   - Add logging in `connectToStream` (around line 178-271)
   - Add logging in event handlers (around line 207-266)
   - Add logging in `handleChunkReceived` (around line 276-339)
   - Add logging in `updateProgress` (around line 484-495)

3. `backend/server.js`
   - Add logging in POST /tts/session (around line 132-229)
   - Add logging in GET /tts/session/:sessionId/stream (around line 241-327)
   - Add logging in generateChunksForSession (around line 520-650)

## Expected Log Output (Success Case)

```
[TTS:UI] ▶️  Starting playback { textLength: 150, useStreaming: true }
[TTS:Streaming] ▶️  Starting session: { textLength: 150, options: {...} }
[TTS:Streaming] 📡 POST /tts/session request
[TTS:Streaming] ✅ Session created: { sessionId: "sess_123", totalChunks: 1 }
[TTS:Streaming] 🔌 Connecting to SSE stream: /tts/session/sess_123/stream
[TTS:Streaming] 🔌 SSE connection opened
[TTS:Streaming] 📋 Meta received: { totalChunks: 1 }
[TTS:Streaming] 📊 Progress: { generated: 0, total: 1 }
[TTS:Streaming] 📦 Chunk 0 received: { cacheHit: false, latencyMs: 1200 }
[TTS:Streaming] 📊 Progress: { generated: 1, total: 1 }
[TTS:Streaming] ▶️  Playing chunk 1/1
[TTS:UI] Streaming progress: { state: 'playing', currentChunk: 0, totalChunks: 1, ... }
```

## Next Steps

1. Add targeted logging to all identified points
2. Test the flow and capture logs
3. Analyze logs to identify exact failure point
4. Implement fix based on findings
5. Remove excessive logging or make it dev-only

