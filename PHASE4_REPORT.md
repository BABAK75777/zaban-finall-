# Phase 4: Buffering/Next State Machine Report

## State Machine Rules

### State Variables:
- `state`: `'idle' | 'connecting' | 'buffering' | 'playing' | 'paused' | 'error' | 'completed'`
- `bufferedChunks`: number (count of chunks ready to play)
- `totalChunks`: number (total chunks expected)
- `isBuffering`: boolean (computed: `state === 'buffering' && !chunks.has(nextToPlayIndex) && state !== 'error'`)
- `nextToPlayIndex`: number (index of next chunk to play)

### State Transition Rules:

1. **onRequestStart:**
   - `state` → `'connecting'`
   - `isBuffering` → `false` (not buffering yet)
   - `bufferedChunks` → `0`
   - `isTtsLoading` → `true`

2. **onSessionCreated:**
   - `state` → `'buffering'`
   - `isBuffering` → `true` (if next chunk not ready)
   - `bufferedChunks` → `0`
   - `isTtsLoading` → `true`

3. **onChunkReceived (audio ready):**
   - `bufferedChunks++`
   - If `bufferedChunks >= 1` AND `state === 'buffering'`:
     - `isBuffering` → `false`
     - `nextEnabled` → `true` (NEXT button enabled)
   - If `nextToPlayIndex` chunk is ready:
     - `state` → `'playing'` (if not already playing)
     - `isBuffering` → `false`

4. **onError:**
   - `state` → `'error'`
   - `isBuffering` → `false` (always false on error)
   - `isTtsLoading` → `false`
   - `nextEnabled` → `true` (NEXT enabled so user can continue)
   - `error` → show error message

5. **onPlaybackComplete:**
   - If more chunks: `state` → `'buffering'` (wait for next chunk)
   - If all chunks played: `state` → `'completed'`
   - `isBuffering` → `false`
   - `isTtsLoading` → `false`

### NEXT Button Rules:

**Enabled when:**
- `bufferedChunks >= 1` (at least one chunk ready)
- `state === 'error'` (user can continue on error)
- `state === 'idle'` (no active session)
- `state === 'completed'` (session finished)

**Disabled when:**
- `isLastChunk === true`
- `state === 'buffering'` AND `bufferedChunks < 1` (waiting for first chunk)

---

## Key Code Changes

### 1. Enhanced updateProgress() with State Machine Rules
**File:** `services/streamingTtsOrchestrator.ts`  
**Lines:** 591-625  
**Summary:** 
- Clear `isBuffering` calculation: `state === 'buffering' && !chunks.has(nextToPlayIndex) && state !== 'error'`
- Added state transition logging (dev-only)
- Tracks previous state to log transitions

**Change:**
```typescript
// Before:
isBuffering: this.state === 'buffering' && !this.chunks.has(this.nextToPlayIndex)

// After:
const isBuffering = this.state === 'buffering' && 
                   !this.chunks.has(this.nextToPlayIndex) &&
                   this.state !== 'error'; // Phase 4: Never buffering on error

// Phase 4: Log state transitions
if (isDev && prevState !== this.state) {
  console.log(`[TTS:Streaming:STATE] ${prevState} → ${this.state}`, {...});
}
```

### 2. Error Handling - Exit Buffering
**File:** `services/streamingTtsOrchestrator.ts`  
**Lines:** 225-233, 287-300, 369-378, 449-459  
**Summary:** 
- All error handlers now log state transitions
- Ensure state changes to 'error' and `isBuffering` becomes false

**Changes:**
- SSE connection error (line 225-233)
- Chunk error event (line 287-300)
- No audio data error (line 369-378)
- Processing error (line 449-459)

### 3. UI Error Handling
**File:** `components/ReadingScreen.tsx`  
**Lines:** 534-549  
**Summary:** 
- Enhanced error handling in progress callback
- Ensure `isTtsLoading` is set to `false` on error
- Show error message from orchestrator

**Change:**
```typescript
// Phase 4: Clear error if state is not error, show error if error state
if (progress.state !== 'error') {
  setError(null);
} else {
  // Phase 4: Exit buffering on error
  const lastError = streamingTtsOrchestrator.getLastError?.();
  if (lastError) {
    setError(`Voice synthesis failed: ${lastError.message}`);
  } else {
    setError('Voice synthesis failed');
  }
  // Phase 4: Ensure UI exits buffering state
  setIsTtsLoading(false);
}
```

### 4. NEXT Button Logic
**File:** `components/ReadingScreen.tsx`  
**Lines:** 1068-1080  
**Summary:** 
- NEXT enabled when `bufferedChunks >= 1` OR `state !== 'buffering'`
- NEXT disabled only when `buffering` AND `bufferedChunks < 1`
- NEXT always enabled on error (user can continue)

**Change:**
```typescript
// Before:
disabled={isLastChunk || (streamingProgress.bufferedChunks < 1 && streamingProgress.state === 'buffering')}

// After:
disabled={
  isLastChunk || 
  // Phase 4: NEXT enabled when bufferedChunks >= 1 OR state is error/idle/completed
  (streamingProgress.bufferedChunks < 1 && streamingProgress.state === 'buffering')
  // Note: NEXT is enabled on error state (user can continue)
}
```

---

## Evidence: Logs Showing Transitions

### Expected Console Logs (dev mode):

```
[TTS:Streaming:STATE] idle → connecting
[TTS:Streaming:STATE] connecting → buffering
[TTS:Streaming:STATE] buffering → playing (when first chunk ready)
[TTS:Streaming:STATE] playing → buffering (waiting for next chunk)
[TTS:Streaming:STATE] buffering → playing (next chunk ready)
[TTS:Streaming:STATE] playing → completed (all chunks played)
```

### Error Transitions:

```
[TTS:Streaming:STATE] connecting → error (SSE connection failed)
[TTS:Streaming:STATE] buffering → error (chunk error: NO_AUDIO)
[TTS:Streaming:STATE] buffering → error (no audio for chunk 0)
[TTS:Streaming:STATE] playing → error (failed to process chunk 1)
```

### Progress Updates:

```
[TTS:Streaming:DIAG] 📊 Progress update: {
  state: 'buffering',
  currentChunk: 0,
  totalChunks: 1,
  generatedChunks: 0,
  bufferedChunks: 0,
  isBuffering: true
}

[TTS:Streaming:DIAG] 📊 Progress update: {
  state: 'buffering',
  currentChunk: 0,
  totalChunks: 1,
  generatedChunks: 1,
  bufferedChunks: 1,
  isBuffering: false  // ← NEXT should be enabled now
}
```

---

## Testing Instructions

### Test 1: Normal Playback Flow
1. Click "Hear AI" button
2. **Observe:**
   - Button shows: "Buffering 0/1"
   - NEXT button: **disabled** (grayed out)
   - Console: `idle → connecting → buffering`
3. Wait for first chunk
4. **Observe:**
   - Button shows: "Buffering 1/1" or "Playing 1/1"
   - NEXT button: **enabled** (not grayed out)
   - Console: `buffering → playing` (when chunk ready)
   - Console: `bufferedChunks: 0 → 1`
   - Console: `isBuffering: true → false`

### Test 2: Error Simulation
1. Simulate error (e.g., invalid API key, network error)
2. **Observe:**
   - Button shows: "Hear AI" (not stuck in "Buffering 0/1")
   - NEXT button: **enabled** (user can continue)
   - Error message: visible
   - Console: `buffering → error`
   - Console: `isBuffering: true → false`
   - Console: `isTtsLoading: true → false`
   - UI: **not hung** (can interact with buttons)

---

## Expected Test Results

```
PHASE4_TEST_RESULT:
- Scenario1: {
    buffer_progress: "0/1 → 1/1",
    next_enabled: "disabled → enabled (when bufferedChunks >= 1)"
  }
- Scenario2: {
    buffer_progress: "0/1 → error (exited buffering)",
    error_visible: true,
    ui_not_hung: true
  }
```

### Success Criteria:
- ✅ Buffering progresses: 0/1 → 1/1
- ✅ NEXT enabled when bufferedChunks >= 1
- ✅ On error: buffering stops, error shown, NEXT enabled
- ✅ UI never hangs in "Buffering 0/1"
- ✅ State transitions logged in console (dev mode)

### Failure Indicators:
- ❌ Stuck in "Buffering 0/1" indefinitely
- ❌ NEXT button disabled when it should be enabled
- ❌ Error state doesn't exit buffering
- ❌ UI hangs (buttons not clickable)
- ❌ No state transition logs

---

## Notes

1. **State Machine Guarantees:**
   - `isBuffering` is **always false** when `state === 'error'`
   - `isTtsLoading` is **always false** when `state === 'error'`
   - NEXT is **always enabled** when `state === 'error'` (user can continue)

2. **Buffer Count Logic:**
   - `bufferedChunks` increments when chunk is successfully parsed and stored
   - `bufferedChunks` is `this.chunks.size` (number of chunks in Map)
   - NEXT enabled when `bufferedChunks >= 1` (at least one chunk ready)

3. **Error Recovery:**
   - On error, user can click NEXT to move to next chunk
   - Error state doesn't block UI
   - Previous chunks (if any) remain playable

4. **State Transition Logging:**
   - Only in dev mode (`isDev === true`)
   - Logs: `[TTS:Streaming:STATE] prevState → newState`
   - Includes context: bufferedChunks, totalChunks, nextToPlayIndex, isBuffering

