# Audio Balancing Implementation

## Overview

Client-side audio balancing controller that manages relative loudness between user microphone and AI voice. All processing is done locally - no audio data is sent to the backend.

## Features

### Microphone Gain (Mobile Only)
- Available gain levels: `1.0`, `1.50`, `1.75`, `2.0`, `2.25`
- Applied using Web Audio API `GainNode`
- Processes MediaStream through Web Audio API
- Returns processed stream for MediaRecorder

### AI Voice Volume Adjustment
- Baseline: AI voice starts at 1:1 ratio with user voice (100%)
- Automatic reduction based on mic gain:
  - Mic gain ≤ 1.50: AI volume = 100% (no reduction)
  - Mic gain 1.75: AI volume = 90%
  - Mic gain 2.0: AI volume = 80%
  - Mic gain 2.25: AI volume = 70%
- Smooth transitions (200ms ease-out curve)
- No sudden loudness jumps

## Architecture

### Files Created/Modified

1. **`services/audioBalancer.ts`** (NEW)
   - Core audio balancing logic
   - Web Audio API processing
   - Mic gain application
   - AI volume calculation and control

2. **`services/audioService.ts`** (MODIFIED)
   - Integrated with audioBalancer
   - Applies mic gain to recording stream
   - Returns processed stream for MediaRecorder

3. **`services/aiAudioPlayer.ts`** (MODIFIED)
   - Registers audio instance with balancer
   - Volume controlled by balancer
   - Smooth volume transitions

## Usage

### Setting Mic Gain

```typescript
import { audioBalancer, MicGainLevel } from './services/audioBalancer';

// Check if mic gain is available (mobile only)
if (audioBalancer.isMicGainAvailable()) {
  // Set mic gain level
  const processedStream = await audioBalancer.setMicGain(1.75, audioStream);
  // Use processedStream for MediaRecorder
}
```

### Getting Available Levels

```typescript
const levels = audioBalancer.getAvailableGainLevels();
// Returns: [1.0, 1.50, 1.75, 2.0, 2.25]
```

### Manual AI Volume Control

```typescript
// Set AI volume directly (0.0 to 1.0)
await audioBalancer.setAiVolume(0.8); // 80%
```

## Audio Quality Rules

✅ **No clipping**: Gain values are clamped to safe ranges  
✅ **No sudden jumps**: Smooth 200ms transitions with ease-out curve  
✅ **User voice dominant**: AI volume automatically reduces as mic gain increases  
✅ **Maintains clarity**: Volume reductions are gradual and non-fatiguing

## Technical Details

### Web Audio Processing Chain

```
MediaStream (from getUserMedia)
  ↓
MediaStreamAudioSourceNode
  ↓
GainNode (mic gain applied)
  ↓
MediaStreamAudioDestinationNode
  ↓
Processed MediaStream (for MediaRecorder)
```

### Volume Calculation

```typescript
// Mic gain ≤ 1.50: AI volume = 100%
// Mic gain 1.75: AI volume = 90% (1.0 - 0.10)
// Mic gain 2.0: AI volume = 80% (1.0 - 0.20)
// Mic gain 2.25: AI volume = 70% (1.0 - 0.30)
// Reduction step: 0.10 (10%) per level above 1.50
```

### Smooth Transitions

- Duration: 200ms
- Curve: Ease-out (cubic)
- Applied only when audio is playing
- Immediate application when audio is stopped

## Mobile Detection

Mic gain is only available on mobile devices. Detection uses:
- User agent string matching
- Screen width ≤ 768px

## Integration Points

### Recording Flow

1. User starts recording
2. `audioService.startRecording()` called
3. Gets MediaStream from `getUserMedia`
4. Applies mic gain via `audioBalancer.setMicGain()`
5. Gets processed stream
6. Creates MediaRecorder with processed stream
7. AI volume automatically adjusted based on mic gain

### Playback Flow

1. AI audio starts playing
2. `aiAudioPlayer.play()` creates Audio element
3. Registers with `audioBalancer.registerAiAudioInstance()`
4. Balancer applies current volume
5. Volume updates smoothly when mic gain changes

## Constraints

- ✅ All processing is client-side
- ✅ No audio data sent to backend
- ✅ AI speech speed not modified (controlled externally)
- ✅ Only manages relative loudness
- ✅ Mic gain only on mobile devices

## Future Enhancements

- Add limiter/compressor to prevent clipping at high gain
- Add visual feedback for current mic gain level
- Add UI controls for mic gain selection
- Add presets for different scenarios

