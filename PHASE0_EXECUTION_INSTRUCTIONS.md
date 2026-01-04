# Phase 0 Execution Instructions

## ⚠️ IMPORTANT: Servers Not Running

**Status Check:**
- Frontend (localhost:3000): NOT_RUNNING
- Backend (localhost:3001): NOT_RUNNING

**Action Required:** Start both servers before proceeding.

---

## Execution Steps

### 1. Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Wait for: "Server running on http://localhost:3001"

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Wait for: "Local: http://localhost:3000"

### 2. Open Browser
- Open Chrome
- Navigate to: http://localhost:3000
- Open DevTools (F12)
- Go to **Console** tab

### 3. Load Phase 0 Script
- Open file: `PHASE0_BASELINE_CAPTURE_SCRIPT.js`
- Copy **entire content**
- Paste into Console tab
- Press Enter
- Should see: "✅ Script loaded successfully!"

### 4. Execute Normal Playback Test

```javascript
// Step 1: Start capture
startNormalCapture()

// Step 2: Click "Hear AI" button (without changing speed)
// → Wait for audio to start playing

// Step 3: Stop capture (after audio starts)
stopCapture()
```

### 5. Execute Speed Change Test

```javascript
// Step 1: Start capture
startSpeedChangeCapture()

// Step 2: Change speed slider (drag and release)
// → Wait a few seconds

// Step 3: Stop capture
stopCapture()
```

### 6. Generate Report

```javascript
generatePhase0Report()
```

**Output will be:**
- Printed in console
- Copied to clipboard automatically

---

## Expected Output Format

```
PHASE0_BASELINE:
- Normal: {OPTIONS_seen: yes/no, OPTIONS_status: 204/200/failed/N/A, A-C-Allow-Headers: <value>, POST_seen: yes/no, POST_status: 200/500/failed/N/A, Content-Type: application/json/audio/..., has_audioBase64: yes/no, audioBase64_length: <number>, console_error_summary: none/<details>}
- SpeedChanged: {same fields}
- Diff: 
  • <difference 1>
  • <difference 2>
  ...
```

---

## Troubleshooting

**If script doesn't load:**
- Check console for syntax errors
- Make sure you copied the entire script
- Refresh page and try again

**If no requests captured:**
- Check Network tab to see if requests are being made
- Verify backend is running
- Check CORS errors in console

**If report is incomplete:**
- Use `viewNormalData()` to see raw data
- Use `viewSpeedChangeData()` to see raw data
- Check console for any errors

---

## After Execution

**Copy the output from `generatePhase0Report()` and provide it to me.**

The output should be in the exact format specified above.

