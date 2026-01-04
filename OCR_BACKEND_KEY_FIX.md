# Fix OCR Backend Key + Safe UI Handling - خلاصه پیاده‌سازی

## مشکل
اپ موبایل هنگام Scan/Upload تصویر برای OCR خطا می‌گرفت:
```
API_KEY_MISSING
OpenAI API key not configured
```

## راه‌حل پیاده‌سازی شده

### فاز 1: Backend ENV Loader و استاندارد کلید ✅

#### 1.1 نصب dotenv
```bash
npm install dotenv
```

#### 1.2 بارگذاری ENV در server.js
```javascript
// Load environment variables FIRST (before any other imports)
import 'dotenv/config';
```

#### 1.3 ساخت utility برای خواندن API key
**فایل:** `backend/utils/env.js`

تابع `getOpenAIApiKey()` با اولویت:
1. `OPENAI_API_KEY` (اولویت اول)
2. `OCR_OPENAI_API_KEY` (مخصوص OCR)
3. `API_KEY` (fallback برای backward compatibility)

```javascript
export function getOpenAIApiKey() {
  // Try OPENAI_API_KEY first
  let key = process.env.OPENAI_API_KEY;
  if (key && typeof key === 'string' && key.trim().length > 0) {
    return key.trim();
  }
  
  // Try OCR_OPENAI_API_KEY
  key = process.env.OCR_OPENAI_API_KEY;
  if (key && typeof key === 'string' && key.trim().length > 0) {
    return key.trim();
  }
  
  // Try API_KEY (legacy)
  key = process.env.API_KEY;
  if (key && typeof key === 'string' && key.trim().length > 0) {
    return key.trim();
  }
  
  return null;
}
```

#### 1.4 به‌روزرسانی server.js
- استفاده از `getOpenAIApiKey()` به جای خواندن مستقیم `process.env.OPENAI_API_KEY`
- لاگ‌های بهتر برای debugging

---

### فاز 2: OCR Endpoint Validation (Fail Fast) ✅

#### 2.1 به‌روزرسانی `/ocr` endpoint
**قبل از هر call به OpenAI:**
- بررسی وجود API key با `getOpenAIApiKey()`
- اگر key نیست → پاسخ JSON استاندارد:

```javascript
{
  "ok": false,
  "error": "API_KEY_MISSING",
  "debugId": "xxxx",
  "details": "OpenAI API key not configured."
}
```

**Status Code:** `500` (server misconfiguration)

#### 2.2 DebugId
هر درخواست یک `debugId` منحصر به فرد دارد برای tracking:
```javascript
const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
```

---

### فاز 3: Health Check برای OCR Readiness ✅

#### 3.1 به‌روزرسانی `/health` endpoint
**قبل:**
```json
{ "ok": true }
```

**بعد:**
```json
{
  "ok": true,
  "ocr": {
    "enabled": true,
    "keyConfigured": true/false
  }
}
```

**استفاده:**
- Frontend می‌تواند قبل از OCR، health check کند
- اگر `keyConfigured: false` → نمایش پیام مناسب به کاربر

---

### فاز 4: Frontend Error Handling (User-Friendly) ✅

#### 4.1 به‌روزرسانی `services/ocrService.ts`
- Mapping خطاهای backend به پیام‌های user-friendly
- شامل `debugId` در پیام خطا برای support
- پیام‌های واضح برای هر نوع خطا

**خطاهای پشتیبانی شده:**
- `API_KEY_MISSING` → "OpenAI API key not configured on server. Please contact administrator."
- `API_KEY_INVALID` → "OpenAI API key is invalid. Please contact administrator."
- `OCR_FAILED` → شامل details از backend
- `OCR_NETWORK_ERROR` → "Cannot connect to OCR service..."

#### 4.2 به‌روزرسانی `components/ReadingScreen.tsx`
- مدیریت خطاهای OCR به صورت graceful
- نمایش پیام‌های user-friendly
- بدون crash/reset
- پیشنهاد جایگزین: "Please paste text manually"

**پیام‌های نمایش داده شده:**
- API Key Missing: "OCR service is not configured. Please contact administrator or paste text manually."
- Network Error: "Cannot connect to OCR service. Please check your connection or paste text manually."
- Other Errors: پیام مناسب با جزئیات

---

## تست‌ها

### تست فاز 1 (Unit Tests)
```javascript
// Test 1: وقتی env خالی است → null
expect(getOpenAIApiKey()).toBe(null);

// Test 2: وقتی OPENAI_API_KEY ست است → همان را برگرداند
process.env.OPENAI_API_KEY = 'test-key';
expect(getOpenAIApiKey()).toBe('test-key');

// Test 3: وقتی فقط OCR_OPENAI_API_KEY ست است → همان را برگرداند
delete process.env.OPENAI_API_KEY;
process.env.OCR_OPENAI_API_KEY = 'ocr-key';
expect(getOpenAIApiKey()).toBe('ocr-key');
```

### تست فاز 2 (Integration)
```bash
# بدون env
POST /ocr → status 500 + error=API_KEY_MISSING

# با env
POST /ocr → وارد مسیر OCR شود
```

### تست فاز 3 (Health Check)
```bash
# بدون env
GET /health → keyConfigured=false

# با env
GET /health → keyConfigured=true
```

---

## فایل‌های تغییر یافته

1. ✅ `backend/utils/env.js` (NEW) - Utility برای خواندن API key
2. ✅ `backend/server.js` (MODIFIED) - dotenv, استفاده از utility, health check
3. ✅ `services/ocrService.ts` (MODIFIED) - Error handling بهتر
4. ✅ `components/ReadingScreen.tsx` (MODIFIED) - نمایش خطاهای user-friendly
5. ✅ `backend/package.json` (MODIFIED) - اضافه شدن dotenv dependency

---

## نحوه استفاده

### تنظیم API Key
در `backend/.env` یا `backend/.env.local`:
```env
OPENAI_API_KEY=sk-...
# یا
OCR_OPENAI_API_KEY=sk-...
# یا (legacy)
API_KEY=sk-...
```

### بررسی Health
```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "ok": true,
  "ocr": {
    "enabled": true,
    "keyConfigured": true
  }
}
```

### تست OCR
```bash
curl -X POST http://localhost:3001/ocr \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/png;base64,..."}'
```

---

## نتیجه

✅ **Backend:** API key از ENV درست خوانده می‌شود  
✅ **Backend:** OCR endpoint بدون key کار نمی‌کند و پاسخ استاندارد می‌دهد  
✅ **Frontend:** خطاها به صورت user-friendly نمایش داده می‌شوند  
✅ **Health Check:** وضعیت OCR readiness قابل بررسی است  
✅ **Backward Compatible:** از `API_KEY` قدیمی هم پشتیبانی می‌کند

**خطای `API_KEY_MISSING` دیگر باعث crash نمی‌شود و به صورت graceful نمایش داده می‌شود.**

