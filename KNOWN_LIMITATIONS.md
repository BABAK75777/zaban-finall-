# Known Limitations

## Audio Export

**Issue**: The session export endpoint (`POST /tts/session/:id/export`) uses simple buffer concatenation to merge audio chunks.

**Impact**: This works for MP3 files but may not produce perfect audio quality for all formats. Audio may have slight gaps or artifacts between chunks.

**Workaround**: For production, consider using ffmpeg or a proper audio library to merge chunks:
```javascript
// Example using ffmpeg (would need to be installed on server)
const ffmpeg = require('fluent-ffmpeg');
// Merge chunks with proper audio processing
```

**Future Improvement**: Implement proper audio merging with ffmpeg or similar library.

---

## SSE on Mobile Networks

**Issue**: Server-Sent Events (SSE) may not work reliably on mobile networks, especially with:
- Weak signal
- Network switching (WiFi to cellular)
- Carrier restrictions

**Impact**: Streaming TTS may fail or be unreliable on mobile.

**Workaround**: The mobile app automatically falls back to chunk-by-chunk fetching using `GET /tts/session/:id/chunk/:index`.

**Future Improvement**: Consider WebSocket as an alternative transport for mobile.

---

## Storage Limits

**Issue**: Mobile devices have limited storage. Default cache limit is 500MB.

**Impact**: Users may need to manage storage manually if they download many sessions.

**Workaround**: 
- LRU eviction automatically removes oldest chunks
- Users can clear cache in settings
- Consider implementing user-configurable storage limits

**Future Improvement**: 
- Add storage usage indicator
- Allow per-session storage limits
- Cloud sync option

---

## Background Audio Permissions

**Issue**: Background audio requires specific permissions and configuration on iOS and Android.

**Impact**: Audio may stop when app is backgrounded if not properly configured.

**Workaround**: 
- iOS: `UIBackgroundModes: ["audio"]` in `app.json`
- Android: Proper audio session configuration
- Test on physical devices (simulators may not fully test background audio)

**Future Improvement**: Add runtime permission checks and user guidance.

---

## Audio Interruption Handling

**Issue**: Phone calls and other audio interruptions may not always resume automatically.

**Impact**: User may need to manually resume playback after interruption.

**Workaround**: App pauses on interruption. User can resume manually.

**Future Improvement**: 
- Auto-resume after short interruptions
- User preference for auto-resume behavior

---

## Simple Chunk Concatenation

**Issue**: Export endpoint concatenates audio buffers directly.

**Impact**: 
- May work for MP3 but not ideal
- No audio normalization between chunks
- Potential for gaps or volume inconsistencies

**Workaround**: For now, this is acceptable for basic use cases.

**Future Improvement**: Use proper audio library for merging with:
- Volume normalization
- Gap removal
- Format-specific handling

---

## Network Fallback Latency

**Issue**: Chunk-by-chunk fetching (mobile fallback) has higher latency than SSE.

**Impact**: Slower initial playback start on mobile with weak networks.

**Workaround**: App buffers chunks and plays sequentially.

**Future Improvement**: 
- Parallel chunk fetching (with limits)
- Predictive pre-fetching
- Better buffering strategy

---

## IndexedDB vs FileSystem

**Issue**: Web uses IndexedDB, mobile uses FileSystem. Different APIs and behaviors.

**Impact**: 
- Different storage limits
- Different eviction policies
- Code duplication

**Workaround**: Abstracted through `StorageAdapter` interface.

**Future Improvement**: Consider unified storage abstraction with better feature parity.

---

## Test Coverage

**Issue**: Some features may not be fully tested on all platforms.

**Impact**: Potential bugs in edge cases.

**Workaround**: 
- Manual testing checklist provided
- Test on multiple devices and networks
- Monitor error logs

**Future Improvement**: 
- Automated E2E tests
- Device farm testing
- Network condition simulation

