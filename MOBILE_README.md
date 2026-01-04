# Mobile TTS App - React Native / Expo

This document covers the mobile app implementation for TTS playback with background audio, downloads, and offline support.

## 📱 Features

- **Background Playback**: Audio continues when app is backgrounded
- **Lock Screen Controls**: Play/pause/next/prev from lock screen
- **Offline Mode**: Download sessions for offline playback
- **Accessibility**: Screen reader support, large touch targets, haptics
- **Download/Export**: Download individual chunks or entire sessions

## 🏗️ Architecture

### Packages

- `packages/tts-core`: Platform-agnostic shared logic (chunking, hashing, session metadata)
- `packages/tts-web`: Web-specific implementations (HTMLAudioElement, IndexedDB)
- `packages/tts-mobile`: Mobile-specific implementations (Expo AV, FileSystem)
- `apps/mobile`: Expo app with screens and navigation

### Key Components

1. **MobileAudioPlayer** (`packages/tts-mobile/src/MobileAudioPlayer.ts`)
   - Uses Expo AV for background playback
   - Handles audio interruptions (phone calls)
   - Maintains playback state

2. **MobileStorageAdapter** (`packages/tts-mobile/src/MobileStorageAdapter.ts`)
   - Uses Expo FileSystem for offline storage
   - Implements LRU eviction policy
   - Stores chunks and session metadata

3. **Reading Screen** (`apps/mobile/app/index.tsx`)
   - Main TTS playback interface
   - Sequential chunk playback
   - Progress indicators

## 🚀 Setup

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### Installation

1. **Install dependencies:**
   ```bash
   cd apps/mobile
   npm install
   ```

2. **Configure API URL:**
   Create `apps/mobile/.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:3001
   ```
   
   For physical devices, use your computer's IP:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.100:3001
   ```

3. **Start the app:**
   ```bash
   npm start
   ```
   
   Then press:
   - `i` for iOS simulator
   - `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## 📋 Permissions

### iOS (`app.json`)

```json
{
  "ios": {
    "infoPlist": {
      "UIBackgroundModes": ["audio"]
    }
  }
}
```

### Android (`app.json`)

```json
{
  "android": {
    "permissions": [
      "android.permission.INTERNET",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE"
    ]
  }
}
```

## 🧪 Testing

### Test 1: Background Playback

1. Start playback
2. Lock phone / switch app
3. **Expected**: Audio continues, lock-screen controls work

### Test 2: Interruption Handling

1. Start playback
2. Receive phone call / simulate audio focus loss
3. **Expected**: Auto pause, resume after interruption

### Test 3: Offline Playback

1. Download/save a session
2. Turn on airplane mode
3. Play session
4. **Expected**: Plays from local files, missing chunks clearly shown

### Test 4: Session Export

1. Complete a TTS session
2. Export as MP3
3. **Expected**: File downloads successfully, playable

### Test 5: Accessibility

1. Enable screen reader (VoiceOver/TalkBack)
2. Navigate app
3. **Expected**: All controls have labels, progress announced

### Test 6: Flaky Network

1. Start streaming on weak network
2. **Expected**: Fallback mode triggers, UI shows "reconnecting", playback continues when possible

## 🔧 Backend Endpoints

### GET `/tts/session/:id/chunk/:index`

Fetch a specific chunk (mobile fallback when SSE doesn't work).

**Query params:**
- `format=json`: Return as JSON with base64
- `base64=true`: Same as format=json

**Response:**
```json
{
  "ok": true,
  "index": 0,
  "hash": "abc123...",
  "audioBase64": "...",
  "format": "mp3",
  "durationMsEstimate": 5000
}
```

### POST `/tts/session/:id/export`

Export entire session as merged audio file.

**Body:**
```json
{
  "format": "mp3"
}
```

**Response:** Binary audio file (MP3)

## 📦 Build for Production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

## 🐛 Known Limitations

1. **Simple Audio Concatenation**: The export endpoint uses simple buffer concatenation. For production, consider using ffmpeg for proper audio merging.

2. **SSE on Mobile**: Server-Sent Events may not work reliably on mobile networks. The app falls back to chunk-by-chunk fetching.

3. **Storage Limits**: Mobile storage is limited. Default max cache is 500MB with LRU eviction.

4. **Background Audio**: Requires proper audio session configuration. Test on physical devices.

## 📚 Additional Resources

- [Expo AV Documentation](https://docs.expo.dev/versions/latest/sdk/av/)
- [Expo FileSystem Documentation](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)

