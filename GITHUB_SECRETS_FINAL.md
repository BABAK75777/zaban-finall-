# 🔐 GitHub Secrets Setup - Final Configuration

## ✅ بررسی Service Account Keys

**نتیجه بررسی:**
- ✅ Key موجود: `SYSTEM_MANAGED` (نیازی به حذف نیست)
- ✅ هیچ `USER_MANAGED` key وجود ندارد

---

## 📋 GitHub Secrets که باید تنظیم کنید

به **GitHub Repository → Settings → Secrets and variables → Actions → New repository secret** بروید.

این 4 Secret را **دقیقاً** با همین نام‌ها بسازید (case-sensitive):

### 1. GCP_PROJECT_ID
```
automatic-opus-390121
```

### 2. GCP_PROJECT_NUMBER
```
875817275251
```

### 3. GCP_SA_EMAIL
```
gha-zaban-deployer@automatic-opus-390121.iam.gserviceaccount.com
```

### 4. WIF_PROVIDER
```
projects/875817275251/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider
```

---

## ⚠️ مهم: حذف Secret قدیمی

اگر Secret زیر وجود دارد، **حتماً حذفش کنید:**
- ❌ `GCP_SA_KEY` → **Delete** (دیگر نیاز نیست، از WIF استفاده می‌کنیم)

---

## 🔍 تأیید نهایی Pool/Provider

**Pool موجود:**
- ✅ `github-actions-pool` (استفاده می‌کنیم)
- ✅ `gha-pool` (نیازی نیست، می‌تونید نگه دارید)

**Provider موجود:**
- ✅ `github-provider` در `github-actions-pool`

**IAM Binding:**
- باید برای repo `BABAK75777/zaban-finall-` تنظیم شود

---

## 🚀 مراحل بعدی

1. Secrets را در GitHub تنظیم کنید (بالا)
2. Workflow را push کنید (در حال انجام...)
3. یک commit خالی برای trigger کردن workflow بزنید:
   ```powershell
   git commit --allow-empty -m "Trigger deploy (WIF)"
   git push origin main
   ```
4. در GitHub → Actions نتیجه را بررسی کنید

---

## ✅ خروجی مورد انتظار

**در GitHub Actions:**
- ✅ Authenticate to Google Cloud
- ✅ Build Docker image
- ✅ Push Docker image to Artifact Registry
- ✅ Deploy to Cloud Run
- ✅ Show deployment URL

**روی سیستم:**
```powershell
# Revision باید تغییر کند
gcloud run services describe zaban-api --region=europe-west1 --format="value(status.latestReadyRevisionName)"

# تست endpoint
$URL = gcloud run services describe zaban-api --region=europe-west1 --format="value(status.url)"
Invoke-WebRequest -UseBasicParsing -Uri "$URL/version"
```