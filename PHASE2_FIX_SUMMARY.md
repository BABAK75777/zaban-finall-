# Phase 2 Fix Summary - Buffering & Audio Playback

## Overview
This document explains the fixes implemented to resolve the stuck "BUFFERING 0/1" state and improve error handling, audio playback, and UI feedback.

## Root Cause Analysis

The stuck state occurred because:
1. **Buffer count didn't increment properly** when chunks were successfully parsed
2. **Error states weren't handled correctly**, causing the state machine to remain in "buffering" even when requests failed
3. **NEXT button logic** didn't check buffer state, only checked if it was the last chunk
4. **Progress callback** could crash if not a function
5. **Audio response formats** weren't supported, causing parsing failures

## Fixes Implemented

### A) Buffering Logic (`services/streamingTtsOrchestrator.ts`)

**Fix 1: Ensure buffer increments on successful chunk parse**
```typescript
// After successfully decoding and creating blob:
this.chunks.set(index, chunkData);
logDev(`✅ Chunk ${index} buffered. Total buffered: ${this.chunks.size}`);
// Buffer count is tracked via this.chunks.size
this.updateProgress(); // This reports bufferedChunks: this.chunks.size
```

**Fix 2: Enable NEXT when bufferCount >= requiredBuffer (1)**
```typescript
// In ReadingScreen.tsx:
disabled={isLastChunk || (useStreaming && streamingProgress && streamingProgress.bufferedChunks < 1 && streamingProgress.state === 'buffering')}
```

**Fix 3: Prevent stuck state - proper error handling**
```typescript
// If chunk has no audio:
if (!audioData || !audioData.audioBase64) {
  this.state = 'error';
  this.lastError = new Error(`No audio returned for chunk ${index}`);
  this.updateProgress(); // Exit buffering state
  return;
}

// If chunk processing fails:
catch (error) {
  this.state = 'error';
  this.lastError = error instanceof Error ? error : new Error(`Failed to process chunk ${index}`);
  this.updateProgress(); // Exit buffering state
}
```

### B) Error Handling

**Fix 1: API failure handling**
```typescript
// In connectToStream():
this.eventSource.onerror = (error) => {
  if (this.state === 'connecting' || this.state === 'buffering') {
    this.state = 'error';
    this.lastError = new Error('Failed to connect to stream');
    this.updateProgress(); // Stop buffering, show error
    reject(this.lastError);
  }
};

// Session creation failure:
if (!response.ok) {
  this.state = 'error';
  this.lastError = new Error(errorMessage);
  this.updateProgress();
  throw this.lastError;
}
```

**Fix 2: Missing audio response handling**
```typescript
// Show user-facing error:
if (err.message.includes('No audio returned')) {
  errorMessage = "No audio was returned from the service. Please try again.";
  if (isDev) {
    console.warn('[TTS:UI] No audio in response:', err);
  }
}
```

**Fix 3: SSE error events**
```typescript
this.eventSource.addEventListener('error', (e: any) => {
  // Handle chunk error - stop buffering and set error state
  if (this.state === 'buffering' || this.state === 'connecting') {
    this.state = 'error';
    this.lastError = new Error(data.message || data.error || 'Chunk generation error');
    this.updateProgress();
  }
});
```

### C) Audio Playback

**Fix 1: Support multiple audio response formats**
```typescript
private extractAudioFromResponse(data: any): { audioBase64: string; mimeType: string } | null {
  // Format 1: { audio: { data, mimeType } }
  if (data.audio?.data) {
    return {
      audioBase64: data.audio.data,
      mimeType: data.audio.mimeType || 'audio/wav',
    };
  }
  
  // Format 2: { audioContent: "base64..." }
  if (data.audioContent) {
    return {
      audioBase64: data.audioContent,
      mimeType: 'audio/wav',
    };
  }
  
  // Format 3: { candidates: [{ content: { parts: [{ inlineData: { data, mimeType } }] } }] }
  if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
    const candidate = data.candidates[0];
    if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          return {
            audioBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'audio/wav',
          };
        }
      }
    }
  }
  
  // Format 4: Direct audioBase64 (existing format)
  if (data.audioBase64) {
    return {
      audioBase64: data.audioBase64,
      mimeType: 'audio/mpeg',
    };
  }
  
  return null;
}
```

**Fix 2: Create Blob with correct mimeType**
```typescript
const mimeType = audioData.mimeType || 
  (this.sessionOptions?.format === 'mp3' ? 'audio/mpeg' :
   this.sessionOptions?.format === 'wav' ? 'audio/wav' :
   this.sessionOptions?.format === 'ogg' ? 'audio/ogg' : 'audio/wav');

const blob = new Blob([bytes], { type: mimeType });
```

**Fix 3: Handle NotAllowedError gracefully**
```typescript
// In aiAudioPlayer.ts:
.catch((err) => {
  if (err instanceof DOMException && err.name === 'NotAllowedError') {
    logDev('⚠️  Audio play() NotAllowedError - user interaction required');
    reject(new Error('Audio playback requires user interaction. Please click the play button.'));
  } else {
    reject(err);
  }
});
```

**Note:** `play()` is already only called after user click (in `handleHearAI`), which is correct.

### D) Crash Guards

**Fix: Safe progressCallback calls**
```typescript
private updateProgress(): void {
  if (typeof this.progressCallback === 'function') {
    try {
      this.progressCallback({
        state: this.state,
        currentChunk: this.nextToPlayIndex,
        totalChunks: this.totalChunks,
        generatedChunks: this.generatedChunks,
        bufferedChunks: this.chunks.size,
        isBuffering: this.state === 'buffering' && !this.chunks.has(this.nextToPlayIndex),
      });
    } catch (err) {
      logDev('⚠️  Error in progress callback:', err);
    }
  }
}
```

### E) UI Correctness

**Fix 1: Show buffering progress**
```typescript
{isTtsLoading 
  ? (useStreaming && streamingProgress
      ? (streamingProgress.state === 'buffering'
          ? `Buffering ${streamingProgress.bufferedChunks}/${streamingProgress.totalChunks}`
          : streamingProgress.state === 'playing'
            ? `Playing ${streamingProgress.currentChunk + 1}/${streamingProgress.totalChunks}`
            : streamingProgress.state === 'connecting'
              ? 'Connecting...'
              : 'Loading...')
      : ...)
  : ...}
```

**Fix 2: Enable NEXT when buffer ready**
```typescript
disabled={isLastChunk || (useStreaming && streamingProgress && streamingProgress.bufferedChunks < 1 && streamingProgress.state === 'buffering')}
```

**Fix 3: Show playing indicator**
```typescript
: streamingProgress?.state === 'playing'
  ? 'Playing'
  : 'Hear AI'
```

**Fix 4: Clear errors when state improves**
```typescript
// Clear error if state is not error
if (progress.state !== 'error') {
  setError(null);
} else {
  // Get error from orchestrator
  const lastError = streamingTtsOrchestrator.getLastError?.();
  if (lastError) {
    setError(`Voice synthesis failed: ${lastError.message}`);
  }
}
```

## Why This Fixes the Stuck State

### Before:
1. Chunk received → decode fails silently → chunk not added to `this.chunks`
2. `bufferedChunks` stays at 0 (because `this.chunks.size === 0`)
3. State remains "buffering" forever
4. NEXT button disabled because `bufferedChunks < 1`
5. User sees "BUFFERING 0/1" indefinitely

### After:
1. Chunk received → if no audio, set state to 'error' and update progress → state machine exits buffering
2. Chunk received → if decode succeeds, chunk added to `this.chunks` → `bufferedChunks` increments → `updateProgress()` called
3. When `bufferedChunks >= 1`, NEXT button becomes enabled
4. If error occurs, state transitions to 'error', user sees error message
5. State machine cannot get stuck because errors always transition state away from 'buffering'

## Files Modified

1. **services/streamingTtsOrchestrator.ts**
   - Added `extractAudioFromResponse()` method
   - Updated `handleChunkReceived()` to use audio extraction
   - Added error state tracking with `lastError`
   - Added crash guards in `updateProgress()`
   - Improved error handling in SSE event listeners
   - Added `getLastError()` method

2. **components/ReadingScreen.tsx**
   - Updated NEXT button to check `bufferedChunks >= 1`
   - Improved button text to show buffering/playing state
   - Added error clearing when state improves
   - Enhanced error messages for better user experience

3. **services/aiAudioPlayer.ts**
   - Added graceful handling for `NotAllowedError`

## Testing Checklist

- [ ] Buffer increments when chunk is successfully fetched & parsed
- [ ] NEXT becomes enabled when `bufferCount >= 1`
- [ ] State machine transitions to 'error' if API fails
- [ ] State machine transitions to 'error' if response has no audio
- [ ] User sees clear error messages (toast/banner)
- [ ] Audio plays correctly from various response formats
- [ ] Correct mimeType is used for audio Blob
- [ ] NotAllowedError is handled gracefully
- [ ] Progress callback doesn't crash
- [ ] UI shows "Buffering X/Y" during buffering
- [ ] UI shows "Playing X/Y" during playback
- [ ] NEXT button enables when buffer is ready

## Summary

The fix ensures:
1. ✅ Buffer increments properly on successful chunk parse
2. ✅ NEXT button enables when `bufferedChunks >= 1`
3. ✅ State machine cannot get stuck - errors always transition state away from 'buffering'
4. ✅ Clear user-facing errors on API failure
5. ✅ Support for multiple audio response formats
6. ✅ Crash guards for progress callback
7. ✅ Proper UI feedback for buffering and playing states

