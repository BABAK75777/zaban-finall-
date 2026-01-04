# TTS Mobile + Web Test Checklist

## ✅ Test 1 — Background Playback

**Steps:**
1. Start playback on mobile app
2. Lock phone / switch to another app
3. Check lock-screen controls

**Expected:**
- ✅ Audio continues playing
- ✅ Lock-screen controls work (play/pause)
- ✅ Audio persists across app switches

**Status:** ⏳ Pending

---

## ✅ Test 2 — Interruption Handling

**Steps:**
1. Start playback on mobile
2. Receive phone call / simulate audio focus loss
3. End call / restore audio focus

**Expected:**
- ✅ Auto pause on interruption
- ✅ Resume after interruption (user action if needed)
- ✅ No audio corruption

**Status:** ⏳ Pending

---

## ✅ Test 3 — Offline Playback

**Steps:**
1. Download/save a session on mobile
2. Turn on airplane mode
3. Play saved session

**Expected:**
- ✅ Plays from local files
- ✅ Missing chunks clearly shown
- ✅ No network errors

**Status:** ⏳ Pending

---

## ✅ Test 4 — Session Export (Web)

**Steps:**
1. Complete a TTS session on web
2. Click "Download session"
3. Verify downloaded file

**Expected:**
- ✅ File downloads successfully
- ✅ Playable audio file (MP3)
- ✅ All chunks merged correctly

**Status:** ⏳ Pending

---

## ✅ Test 5 — Accessibility Keyboard Navigation (Web)

**Steps:**
1. Navigate without mouse
2. Use keyboard shortcuts:
   - `Space` = play/pause
   - `S` = stop
   - `N` = next chunk
   - `P` = prev chunk

**Expected:**
- ✅ Fully usable without mouse
- ✅ ARIA announcements correct
- ✅ Focus management works

**Status:** ⏳ Pending

---

## ✅ Test 6 — Flaky Network

**Steps:**
1. Start streaming on weak network
2. Observe behavior during network issues

**Expected:**
- ✅ Fallback mode triggers
- ✅ UI shows "reconnecting"
- ✅ Playback continues when possible

**Status:** ⏳ Pending

---

## ✅ Test 7 — Chunk Download (Web)

**Steps:**
1. Play a session with multiple chunks
2. Click "Download chunk" for a specific chunk
3. Verify downloaded file

**Expected:**
- ✅ Chunk downloads as MP3
- ✅ File is playable
- ✅ Correct chunk content

**Status:** ⏳ Pending

---

## ✅ Test 8 — Mobile Storage Eviction

**Steps:**
1. Download multiple large sessions
2. Exceed storage limit (500MB)
3. Check eviction behavior

**Expected:**
- ✅ LRU eviction works
- ✅ Oldest chunks removed first
- ✅ Storage stays under limit

**Status:** ⏳ Pending

---

## ✅ Test 9 — Screen Reader (Mobile)

**Steps:**
1. Enable VoiceOver (iOS) or TalkBack (Android)
2. Navigate app
3. Use all controls

**Expected:**
- ✅ All controls have labels
- ✅ Progress announced
- ✅ State changes announced

**Status:** ⏳ Pending

---

## ✅ Test 10 — Haptic Feedback (Mobile)

**Steps:**
1. Start/stop/pause playback
2. Observe haptic feedback

**Expected:**
- ✅ Haptics on state changes
- ✅ Appropriate intensity
- ✅ Not overwhelming

**Status:** ⏳ Pending

---

## Known Limitations

1. **Simple Audio Concatenation**: Export uses buffer concatenation. For production, consider ffmpeg.

2. **SSE on Mobile**: May not work on all mobile networks. App falls back to chunk fetch.

3. **Storage Limits**: Default 500MB cache with LRU eviction.

4. **Background Audio**: Requires proper device permissions and audio session config.

---

## Test Environment

- **Web**: Chrome, Firefox, Safari
- **Mobile**: iOS 15+, Android 10+
- **Network**: WiFi, 4G, 3G (for flaky network test)

