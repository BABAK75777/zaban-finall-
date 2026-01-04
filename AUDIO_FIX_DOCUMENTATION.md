# Audio Playback Fix - Complete Documentation

## Root Cause Analysis

### The Bug
AI audio playback speed was changing unpredictably, tracking user voice playback speed changes.

### Root Causes (Fixed)

1. **Shared Singleton Audio Instance**
   - `audioService` used a single `activeAudio: HTMLAudioElement | null` for both user and AI playback
   - Both audio types competed for the same instance
   - When user audio stopped, AI audio would inherit its state

2. **Global Playback Rate State**
   - `currentPlaybackRate` was a global variable shared between all audio
   - `setPlaybackRate()` modified the global rate and applied it to ANY currently playing audio
   - User speed controls (via slider) called `audioService.setPlaybackRate()`, affecting AI playback

3. **Rate Applied to All Audio**
   - In `playSoundFromBlob()`, `audio.playbackRate = currentPlaybackRate` was set
   - This meant AI audio used whatever rate was last set by user controls
   - No isolation between user and AI audio pipelines

4. **No Request Sequencing**
   - Multiple rapid "Hear AI" clicks could cause overlapping playback
   - No mechanism to cancel stale API responses

5. **Long Text Performance Issues**
   - Entire text sent to TTS API at once
   - UI blocked during TTS generation for long texts
   - No chunking or progress feedback

## Solution Implemented

### 1. Complete Audio Pipeline Isolation

**Created two separate players:**

- `services/userAudioPlayer.ts` - Handles user-recorded audio playback only
- `services/aiAudioPlayer.ts` - Handles AI-generated audio playback only

Each player:
- Has its own `HTMLAudioElement` instance
- Manages its own blob URLs and lifecycle
- Never shares state with the other player

### 2. Fixed AI Playback Rate

**Critical enforcement in `aiAudioPlayer.ts`:**

```typescript
const FIXED_PLAYBACK_RATE = 1.0;

function enforcePlaybackRate(audio: HTMLAudioElement): void {
  if (audio.playbackRate !== FIXED_PLAYBACK_RATE) {
    audio.playbackRate = FIXED_PLAYBACK_RATE;
    if ('preservesPitch' in audio) {
      (audio as any).preservesPitch = true;
    }
  }
}
```

- Rate is enforced on: load, canplay, play, and periodically during playback
- Dev mode logs warnings if rate is incorrect
- `preservesPitch = true` prevents chipmunk effect

### 3. Request Sequencing

**Monotonically increasing request IDs:**

```typescript
let currentRequestId: number = 0;

getNextRequestId(): number {
  currentRequestId += 1;
  return currentRequestId;
}
```

- Each playback request gets a unique ID
- Stale responses are ignored
- `cancel()` increments request ID, invalidating in-flight requests

### 4. Text Chunking for Performance

**`services/textChunker.ts`:**

- Splits text into ~400 character chunks at sentence boundaries
- `services/chunkedTtsPlayer.ts` handles sequential playback
- Progress callbacks for UI feedback
- Cancellation support

**Benefits:**
- UI stays responsive for long texts
- Progress indicator shows "Chunk X/Y"
- Can cancel mid-playback
- Sequential TTS requests don't block UI

### 5. Updated `audioService.ts`

**Stripped down to recording only:**
- Removed all playback functionality
- Removed `setPlaybackRate()` method
- Only handles microphone recording now

## Files Changed

### New Files
1. `services/userAudioPlayer.ts` - User audio player
2. `services/aiAudioPlayer.ts` - AI audio player with fixed rate
3. `services/textChunker.ts` - Text chunking utility
4. `services/chunkedTtsPlayer.ts` - Chunked TTS playback handler
5. `tests/audioPlayers.test.ts` - Unit tests

### Modified Files
1. `services/audioService.ts` - Removed playback, kept recording
2. `components/ReadingScreen.tsx` - Uses new players, adds progress UI

## Testing Checklist

### Manual Test Scenarios

#### ✅ Test 1: AI Playback Rate Stability
1. Open app and load text
2. Click "Hear AI" - audio plays at normal speed
3. While AI is playing, change speed slider (0.5x, 1.5x, 2.0x)
4. **Expected:** AI audio speed does NOT change, stays at 1.0x
5. Click "Hear AI" again after speed change
6. **Expected:** Still plays at 1.0x

#### ✅ Test 2: User Audio Independence
1. Record user voice (hold record button)
2. Stop recording - user audio plays back
3. While user audio is playing, click "Hear AI"
4. **Expected:** 
   - AI audio plays at 1.0x (stable)
   - User audio may overlap or stop (implementation-dependent)
   - No speed interference between them

#### ✅ Test 3: Rapid "Hear AI" Clicks
1. Click "Hear AI" button 10 times rapidly
2. **Expected:**
   - Only one audio plays at a time
   - Previous playback stops cleanly
   - No overlapping audio
   - No errors or crashes
   - All playbacks are at 1.0x speed

#### ✅ Test 4: Long Text Performance
1. Input very long text (3000+ characters)
2. Click "Hear AI"
3. **Expected:**
   - UI remains responsive (no freezing)
   - Progress indicator shows "Chunk X/Y"
   - Cancel button appears and works
   - Audio plays sequentially through chunks
   - No memory leaks

#### ✅ Test 5: Cancel During Playback
1. Start long text playback
2. Wait for chunk 3/12
3. Click Cancel button
4. **Expected:**
   - Playback stops immediately
   - No further API calls
   - Progress indicator disappears
   - Can start new playback without issues

#### ✅ Test 6: Navigation Cleanup
1. Start AI playback
2. Navigate away or close app
3. **Expected:**
   - Audio stops cleanly
   - No memory leaks
   - No console errors about unmounted components

#### ✅ Test 7: Browser Console Debugging
1. Open browser DevTools console
2. Play AI audio
3. **Expected:**
   - See `[AiAudioPlayer]` logs with:
     - Request ID
     - Playback rate (should always be 1.0)
     - Duration
     - State transitions
   - No warnings about incorrect playback rate

### Automated Tests

Run unit tests:
```bash
npm test
```

**Test Coverage:**
- ✅ `chunkText()` - Various text lengths and edge cases
- ✅ Request ID sequencing - Monotonically increasing
- ✅ Stale request rejection - Old requestIds ignored
- ✅ Playback rate enforcement - Rate set to 1.0

## Runtime Debug Assertions

**Dev-only checks in `aiAudioPlayer.ts`:**

```typescript
function enforcePlaybackRate(audio: HTMLAudioElement): void {
  if (audio.playbackRate !== FIXED_PLAYBACK_RATE) {
    const oldRate = audio.playbackRate;
    audio.playbackRate = FIXED_PLAYBACK_RATE;
    
    if (isDev) {
      console.warn(
        `[AiAudioPlayer] Playback rate was ${oldRate}, forced to ${FIXED_PLAYBACK_RATE}`
      );
    }
  }
}
```

**What to watch for:**
- If warnings appear in console, investigate what's modifying playbackRate
- Check browser extensions or other scripts
- Verify no code is calling `audio.playbackRate` directly on AI audio element

## Error Handling

### Self-Healing Mechanisms

1. **Playback Rate Detection**
   - If rate != 1.0, automatically reset to 1.0
   - Log warning in dev mode
   - Continue playback

2. **API Response Errors**
   - Log full response in dev mode
   - Show user-friendly error message
   - Don't crash the app

3. **Audio Decode Failures**
   - Try once, show error
   - Allow retry by clicking "Hear AI" again

4. **Stale Request Handling**
   - Automatically ignore if requestId doesn't match
   - Clean up resources
   - No error thrown (silent ignore)

## Performance Optimizations

1. **Chunking Strategy**
   - ~400 chars per chunk (optimal for API)
   - Minimum 100 chars to avoid too many tiny chunks
   - Sentence-boundary splitting when possible

2. **Blob URL Management**
   - URLs created only for current playback
   - Old URLs revoked immediately after stop
   - No memory leaks

3. **Request Cancellation**
   - AbortController for API calls (if using fetch)
   - Request ID invalidation prevents stale responses
   - Clean stop of audio playback

## Migration Notes

### Breaking Changes

**Removed from `audioService`:**
- `setPlaybackRate(rate: number)` - No longer exists
- `playSoundFromBlob(blob: Blob)` - Use `aiAudioPlayer.play()` or `userAudioPlayer.play()`
- `stopAllPlayback()` - Use `aiAudioPlayer.stop()` or `userAudioPlayer.stop()`

**New API:**

```typescript
// User audio
import { userAudioPlayer } from './services/userAudioPlayer';
await userAudioPlayer.play(blob);
userAudioPlayer.stop();

// AI audio (single chunk)
import { aiAudioPlayer } from './services/aiAudioPlayer';
const requestId = aiAudioPlayer.getNextRequestId();
await aiAudioPlayer.play(blob, requestId);
aiAudioPlayer.cancel(); // Cancels current request

// AI audio (chunked, recommended for all text)
import { chunkedTtsPlayer } from './services/chunkedTtsPlayer';
await chunkedTtsPlayer.play(text, path, (progress) => {
  console.log(`Chunk ${progress.currentChunk}/${progress.totalChunks}`);
});
chunkedTtsPlayer.cancel();
```

## Verification

After implementation, verify:

1. ✅ No shared audio instances between user and AI
2. ✅ AI playback rate always 1.0 (check browser DevTools)
3. ✅ Rapid clicks don't cause overlapping playback
4. ✅ Long texts don't freeze UI
5. ✅ Cancel works mid-playback
6. ✅ No memory leaks (check DevTools Memory profiler)
7. ✅ Console logs show correct behavior in dev mode

## Future Improvements

Potential enhancements (not required for fix):

1. **Backend Streaming Support**
   - If backend supports streaming, use stream-play for better UX
   - Reduce latency for long texts

2. **Advanced Chunking**
   - Adaptive chunk size based on sentence complexity
   - Smart pause insertion for natural breaks

3. **Playback Queue**
   - Queue multiple chunks in advance
   - Smoother transitions between chunks

4. **Rate Limiting**
   - Prevent API abuse from rapid clicks
   - Queue requests instead of cancelling

