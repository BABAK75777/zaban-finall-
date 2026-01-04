# OCR Error Handling - فاز 4 و 5 کامل

## خلاصه تغییرات

### فاز 4: Mobile - Graceful Error Handling ✅

#### 4.1 ساخت OcrError Class
**فایل:** `services/ocrService.ts`

```typescript
export type OcrErrorCode = 'API_KEY_MISSING' | 'NETWORK' | 'INVALID_IMAGE' | 'UNKNOWN';

export class OcrError extends Error {
  code: OcrErrorCode;
  debugId?: string;
  details?: string;
}
```

**ویژگی‌ها:**
- ✅ خطاها normalize می‌شوند (نه throw خام)
- ✅ کد ثابت برای هر نوع خطا
- ✅ شامل `debugId` برای tracking
- ✅ شامل `details` برای پیام‌های user-friendly

#### 4.2 به‌روزرسانی extractText
- ✅ همه خطاها به `OcrError` تبدیل می‌شوند
- ✅ Mapping خطاهای backend به کدهای مناسب
- ✅ Network errors به `NETWORK` تبدیل می‌شوند
- ✅ API key errors به `API_KEY_MISSING` تبدیل می‌شوند

#### 4.3 به‌روزرسانی ReadingScreen.tsx
**State جدید:**
```typescript
const [ocrError, setOcrError] = useState<OcrError | null>(null);
```

**Handler به‌روزرسانی شده:**
- ✅ `handleFileUpload` از `OcrError` استفاده می‌کند
- ✅ State به "ready" برمی‌گردد (بدون reset/crash)
- ✅ متن فعلی کاربر پاک نمی‌شود
- ✅ UI Dialog برای نمایش خطا

**UI Dialog:**
- ✅ پیام user-friendly بر اساس error code
- ✅ دکمه "Retry" برای `API_KEY_MISSING`
- ✅ دکمه "Close" برای بستن dialog
- ✅ نمایش `debugId` برای support

**پیام‌های نمایش داده شده:**
- `API_KEY_MISSING`: "OCR is not configured on the server (API key missing)."
- `NETWORK`: "Cannot connect to OCR service. Please check your connection."
- `INVALID_IMAGE`: "Invalid image provided. Please try a different image."
- `UNKNOWN`: نمایش details از error

---

### فاز 5: ENV Configuration ✅

#### 5.1 فایل .env.example
**فایل:** `backend/.env.example`

شامل:
- `OPENAI_API_KEY` (primary)
- `OCR_OPENAI_API_KEY` (optional, OCR-specific)
- `API_KEY` (legacy fallback)
- سایر تنظیمات server

#### 5.2 اطمینان از Load شدن ENV
- ✅ `dotenv` در `server.js` import شده
- ✅ `import 'dotenv/config'` در ابتدای فایل
- ✅ ENV قبل از هر استفاده load می‌شود

---

## تست‌ها

### تست فاز 4 (Unit)
```typescript
// Mock extractText که OcrError(API_KEY_MISSING) بدهد
const mockError = new OcrError('OCR unavailable', 'API_KEY_MISSING', { debugId: 'test123' });
jest.spyOn(ocrService, 'extractText').mockRejectedValue(mockError);

// UI باید پیام را نشان دهد، crash نشود
expect(screen.getByText(/OCR is not configured/)).toBeInTheDocument();
expect(screen.getByText('Retry')).toBeInTheDocument();
```

### تست فاز 4 (Manual)
1. Backend بدون key اجرا شود
2. Upload/Scan تصویر
3. **نتیجه:**
   - ✅ پیام "OCR is not configured on the server (API key missing)."
   - ✅ دکمه Retry و Close نمایش داده شود
   - ✅ اپ crash/reset نشود
   - ✅ متن فعلی حفظ شود

### تست فاز 5
```bash
# 1. کپی .env.example به .env
cp backend/.env.example backend/.env

# 2. ویرایش .env و اضافه کردن API key
# OPENAI_API_KEY=sk-...

# 3. Restart backend
cd backend && npm run dev

# 4. بررسی health check
curl http://localhost:3001/health

# Response باید باشد:
# {
#   "ok": true,
#   "ocr": {
#     "enabled": true,
#     "keyConfigured": true
#   }
# }
```

---

## تست End-to-End نهایی

### سناریو 1: Backend بدون Key
```bash
# 1. Backend را بدون OPENAI_API_KEY اجرا کن
cd backend
# .env را حذف یا rename کن
npm run dev

# 2. در موبایل: Upload/Scan تصویر
```

**نتیجه مورد انتظار:**
- ✅ پیام "OCR is not configured on the server (API key missing)."
- ✅ اپ crash/reset نشود
- ✅ Dialog با دکمه Retry/Close نمایش داده شود
- ✅ State به "ready" برگردد

### سناریو 2: Backend با Key
```bash
# 1. .env را با OPENAI_API_KEY پر کن
cd backend
echo "OPENAI_API_KEY=sk-..." > .env

# 2. Restart backend
npm run dev

# 3. بررسی health check
curl http://localhost:3001/health
# باید keyConfigured=true باشد

# 4. در موبایل: Upload/Scan تصویر
```

**نتیجه مورد انتظار:**
- ✅ OCR موفق شود
- ✅ متن استخراج شده در text area / reading text قرار بگیرد
- ✅ هیچ خطایی نمایش داده نشود

---

## فایل‌های تغییر یافته

1. ✅ `services/ocrService.ts` - OcrError class + normalized errors
2. ✅ `components/ReadingScreen.tsx` - Graceful error handling + UI dialog
3. ✅ `backend/.env.example` (NEW) - Template برای ENV configuration

---

## لاگ‌ها

### قبل از Fix
```
[OCR] Error: API_KEY_MISSING: OpenAI API key not configured...
❌ LogBox قرمز دائمی
❌ اپ reset می‌شود
```

### بعد از Fix
```
[OCR] OcrError: {
  code: 'API_KEY_MISSING',
  message: 'OCR unavailable: API key missing',
  debugId: 'abc123',
  details: 'OpenAI API key not configured on server'
}
✅ Dialog user-friendly نمایش داده می‌شود
✅ اپ crash/reset نمی‌شود
✅ debugId حفظ می‌شود برای دیباگ
```

---

## نتیجه

✅ **Backend:** API key از ENV درست خوانده می‌شود  
✅ **Backend:** OCR endpoint بدون key کار نمی‌کند و پاسخ استاندارد می‌دهد  
✅ **Frontend:** خطاها به صورت graceful handle می‌شوند  
✅ **Frontend:** UI Dialog با پیام‌های user-friendly  
✅ **Frontend:** بدون crash/reset - state حفظ می‌شود  
✅ **ENV:** .env.example برای راه‌اندازی آسان  
✅ **Debug:** debugId در UI/Log حفظ می‌شود

**خطای `API_KEY_MISSING` دیگر باعث LogBox قرمز دائمی و حس "reset" نمی‌شود!** 🎉

