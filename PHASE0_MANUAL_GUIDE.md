# Phase 0: Baseline Evidence Capture - راهنمای دستی

## هدف
ثبت دقیق Baseline Evidence Pack برای مقایسه‌های بعدی

---

## آماده‌سازی

### 1. روشن کردن Frontend و Backend
```bash
# Terminal 1: Backend
cd backend
npm run dev
# باید روی localhost:3001 اجرا شود

# Terminal 2: Frontend  
npm run dev
# باید روی localhost:3000 اجرا شود
```

### 2. باز کردن Chrome DevTools
- `F12` بزن یا راست کلیک → Inspect
- به **Network** tab برو
- **"Preserve log"** را فعال کن (checkbox)
- در filter box بنویس: `tts`
- Network tab را خالی کن (Clear)

---

## سناریو A: Normal Playback

### گام 1: شروع ثبت
- در Console tab، اسکریپت `PHASE0_BASELINE_CAPTURE_SCRIPT.js` را اجرا کن
- دستور `startNormalCapture()` را بزن

### گام 2: اجرای Normal Playback
- **مهم:** Speed slider را لمس نکن
- دکمه **"Hear AI"** یا **Play** را بزن
- صبر کن تا playback شروع/تمام شود

### گام 3: ثبت داده‌ها

#### در Network Tab:

**1. OPTIONS Request (اگر وجود دارد):**
- روی `OPTIONS /tts` کلیک کن
- **General Tab:**
  - Status: `<کد وضعیت>` (مثلاً 204, 200, یا failed)
- **Headers Tab → Request Headers:**
  - `Access-Control-Request-Headers`: `<مقدار دقیق>` (مثلاً "content-type, x-request-id")
- **Headers Tab → Response Headers:**
  - `access-control-allow-origin`: `<مقدار دقیق>`
  - `access-control-allow-methods`: `<مقدار دقیق>`
  - `access-control-allow-headers`: `<مقدار دقیق>` ← **این مهم است**

**2. POST Request:**
- روی `POST /tts` کلیک کن
- **General Tab:**
  - Status: `<کد وضعیت>` (مثلاً 200, 400, 500)
- **Headers Tab → Request Headers:**
  - `Content-Type`: `<مقدار>` (باید "application/json")
  - `X-Request-Id`: `<مقدار>` (اگر وجود دارد)
- **Headers Tab → Response Headers:**
  - `content-type`: `<مقدار دقیق>` (مثلاً "application/json" یا "audio/mpeg")
- **Payload Tab (یا Request Tab):**
  - `text`: `<اولین 50 کاراکتر>`
  - `hash`: `<مقدار hash>`
- **Response Tab (یا Preview Tab):**
  - اگر JSON است:
    - تمام کلیدهای top-level را لیست کن
    - آیا `audioBase64` وجود دارد؟ (yes/no)
    - اگر وجود دارد، طولش چقدر است؟ (تعداد کاراکتر)

**3. Console Errors:**
- به **Console** tab برو
- تمام خطاهای مربوط به TTS/CORS/Fetch را کپی کن
- اگر خطایی نیست، بنویس: "none"

### گام 4: توقف ثبت
- در Console: `stopCapture()` بزن

---

## سناریو B: Speed Change Playback

### گام 1: پاک کردن Network Tab
- در Network tab، راست کلیک → Clear
- "Preserve log" را همچنان فعال نگه دار

### گام 2: شروع ثبت
- در Console: `startSpeedChangeCapture()` بزن

### گام 3: اجرای Speed Change
- **Speed slider** را به مقدار دیگری تغییر بده
- **Slider را رها کن** (این `triggerTestPlayback()` را اجرا می‌کند)
- صبر کن تا test playback شروع/تمام شود

### گام 4: ثبت داده‌ها
- همان مراحل سناریو A را تکرار کن
- **توجه:** در این سناریو، request body باید `text: "Voice check."` باشد

### گام 5: توقف ثبت
- در Console: `stopCapture()` بزن

---

## تولید گزارش

### روش 1: استفاده از اسکریپت (توصیه می‌شود)
```javascript
generatePhase0Report()
```
این دستور گزارش را در Console نمایش می‌دهد و به clipboard کپی می‌کند.

### روش 2: پر کردن دستی فرمت

اگر اسکریپت کار نکرد، این فرمت را دستی پر کن:

```
PHASE0_BASELINE:
- Normal: {
  OPTIONS_seen: yes/no,
  OPTIONS_status: <status code or "N/A">,
  A-C-Allow-Headers: <exact value or "N/A">,
  POST_seen: yes/no,
  POST_status: <status code or "N/A">,
  Content-Type: <exact value>,
  has_audioBase64: yes/no,
  audioBase64_length: <number or 0>,
  console_error_summary: <error messages or "none">
}
- SpeedChanged: {
  OPTIONS_seen: yes/no,
  OPTIONS_status: <status code or "N/A">,
  A-C-Allow-Headers: <exact value or "N/A">,
  POST_seen: yes/no,
  POST_status: <status code or "N/A">,
  Content-Type: <exact value>,
  has_audioBase64: yes/no,
  audioBase64_length: <number or 0>,
  console_error_summary: <error messages or "none">
}
- Diff: [
  • <difference 1>,
  • <difference 2>,
  ...
]
```

---

## چک‌لیست کامل بودن گزارش

- [ ] Normal: همه فیلدها پر شده‌اند (نه "N/A" یا خالی)
- [ ] SpeedChanged: همه فیلدها پر شده‌اند
- [ ] OPTIONS_seen: yes یا no (نه "N/A")
- [ ] POST_seen: yes یا no (نه "N/A")
- [ ] اگر OPTIONS_seen=yes، پس OPTIONS_status باید عدد باشد
- [ ] اگر POST_seen=yes، پس POST_status باید عدد باشد
- [ ] Content-Type مقدار دقیق دارد (نه "N/A")
- [ ] has_audioBase64: yes یا no
- [ ] اگر has_audioBase64=yes، پس audioBase64_length باید عدد باشد
- [ ] console_error_summary: یا "none" یا پیام خطا
- [ ] Diff list: تمام تفاوت‌ها لیست شده‌اند

---

## مثال گزارش کامل

```
PHASE0_BASELINE:
- Normal: {
  OPTIONS_seen: yes,
  OPTIONS_status: 204,
  A-C-Allow-Headers: "Content-Type, Authorization, x-request-id, X-Request-Id",
  POST_seen: yes,
  POST_status: 200,
  Content-Type: "application/json",
  has_audioBase64: yes,
  audioBase64_length: 45234,
  console_error_summary: "none"
}
- SpeedChanged: {
  OPTIONS_seen: yes,
  OPTIONS_status: 204,
  A-C-Allow-Headers: "Content-Type, Authorization, x-request-id, X-Request-Id",
  POST_seen: yes,
  POST_status: 200,
  Content-Type: "application/json",
  has_audioBase64: yes,
  audioBase64_length: 1234,
  console_error_summary: "none"
}
- Diff: [
  • audioBase64_length differs: Normal=45234, Speed=1234 (expected - different text)
]
```

---

## نکات مهم

1. **دقت در کپی کردن مقادیر:** همه مقادیر را دقیق کپی کن (مثلاً فاصله‌ها، حروف بزرگ/کوچک)
2. **اسکرین‌شات:** اگر چیزی مبهم است، اسکرین‌شات بگیر
3. **Console errors:** فقط خطاهای مربوط به TTS/CORS/Fetch را ثبت کن
4. **Timing:** اگر request خیلی سریع است، از "Preserve log" استفاده کن
5. **Multiple requests:** اگر چندین request دیدی، همه را ثبت کن

---

## عیب‌یابی

### اگر OPTIONS request نمی‌بینی:
- ممکن است CORS preflight انجام نشود (اگر headers ساده باشند)
- این OK است - بنویس: `OPTIONS_seen: no`

### اگر POST request نمی‌بینی:
- Console را چک کن برای خطاها
- Network tab را برای هر request به `/tts` بررسی کن
- ممکن است request به endpoint دیگری برود (مثلاً `/tts/session`)

### اگر اسکریپت کار نمی‌کند:
- از روش دستی استفاده کن
- تمام داده‌ها را از Network tab و Console tab جمع کن

