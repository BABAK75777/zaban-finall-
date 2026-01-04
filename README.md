<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15DAqgNC2YqRqXwmZjz5vBxY9-fF9xWid

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Ensure `.env.local` file exists in the root directory with:
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_API_KEY=your_gemini_api_key_here
   VITE_ENABLE_OCR=true
   ```
   - `VITE_API_URL`: Your backend API URL (required, default: `http://localhost:3001`)
   - `VITE_API_KEY`: Your Gemini API key (required for OCR and TTS features)
   - `VITE_ENABLE_OCR`: Set to `"true"` to enable OCR image-to-text feature (default: disabled)

   **Note:** `.env.local` should already exist. If missing, create it with the above content.
   
   **OCR Setup:**
   - OCR requires `VITE_API_KEY` (Gemini API key) to extract text from images
   - If `VITE_ENABLE_OCR` is not set or `false`, OCR is disabled and upload will show a clear error message
   - If `VITE_ENABLE_OCR=true` but `VITE_API_KEY` is missing, upload will show "OCR is disabled (missing API key)"
   - **Security Note:** API keys in frontend `.env.local` are exposed in the browser. For production, consider moving OCR to backend.

3. Run the app:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:3000` (or the next available port).

## Backend API Integration

This frontend is configured to connect to a backend API. See [BACKEND_SETUP.md](./BACKEND_SETUP.md) for:
- CORS configuration
- Required API endpoints
- Network setup for mobile devices
- Production deployment tips

The app will automatically check the API connection on startup and display a status banner.

## 📱 Mobile App (React Native / Expo)

The mobile app provides background playback, offline downloads, and mobile-optimized UX.

### Quick Start

1. **Install dependencies:**
   ```bash
   cd apps/mobile
   npm install
   ```

2. **Start the app:**
   ```bash
   npm start
   ```

3. **Run on device:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go for physical device

See [MOBILE_README.md](./MOBILE_README.md) for detailed mobile setup, testing, and build instructions.

### Mobile Features

- ✅ Background audio playback
- ✅ Lock-screen controls
- ✅ Offline session downloads
- ✅ Mobile-optimized storage (FileSystem)
- ✅ Accessibility (screen reader, haptics)
- ✅ Network fallback (chunk-by-chunk fetch)

## 🎯 Features

### Web
- Streaming SSE orchestration
- Chunking + caching (IndexedDB)
- Download chunks/sessions
- Keyboard shortcuts (Space, S, N, P)
- ARIA labels and screen reader support

### Mobile
- Background playback (Expo AV)
- Offline storage (FileSystem)
- Lock-screen controls
- Haptic feedback
- Network fallback mode
