# 📝 راهنمای کامل Deploy کردن VTEEMO Backend

## 🔄 مرحله 1: آپلود به GitHub

### گزینه A: اگر repository جدید می‌خوای بسازی:

1. **به GitHub برو و New Repository بساز:**
   - نام: `vteemo-backend`
   - توضیحات: `VTEEMO Video Platform Backend API`
   - Public یا Private (هر کدوم که می‌خوای)
   - README و .gitignore رو تیک نزن (چون داریم)

2. **Repository رو اضافه کن:**
```bash
cd C:\project\backend-vteemo
git remote add origin https://github.com/YourUsername/vteemo-backend.git
git branch -M main
git push -u origin main
```

### گزینه B: اگر repository موجود داری:

```bash
cd C:\project\backend-vteemo
git remote add origin https://github.com/YourUsername/existing-repo.git
git push -u origin main
```

## 🚀 مرحله 2: Deploy در Liara

### روش 1: مستقیم از پوشه محلی
```bash
# 1. مطمئن شو login هستی
liara auth whoami

# 2. اگر login نیستی
liara auth login

# 3. Deploy کن
liara deploy --app vteemo-backend --port 3000
```

### روش 2: از طریق GitHub (توصیه می‌شه)

1. **به panel Liara برو:** https://console.liara.ir

2. **App جدید بساز یا موجودی رو ویرایش کن:**
   - نام: `vteemo-backend`
   - Platform: `NodeJS`
   - Plan: انتخاب کن

3. **تب "برنامه" → "تنظیمات" → "پیوند گیت":**
   - Repository URL: `https://github.com/YourUsername/vteemo-backend`
   - Branch: `main`
   - Auto Deploy: فعال کن

4. **Environment Variables تنظیم کن:**
   - تب "برنامه" → "تنظیمات" → "متغیرهای محیطی"
   - همه متغیرهای `.env.production` رو اضافه کن:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=VtEeMo2025SuperSecretKey4ProductionUse32CharsLong
DB_HOST=vteemo-db
DB_PORT=3306
DB_NAME=agitated_turing
DB_USER=root
DB_PASS=jbt8Om7ve4FbhScfLjwIyUMY
STORAGE_ENDPOINT=https://storage.c2.liara.space
STORAGE_ACCESS_KEY=nd3sn6706v3vc49e
STORAGE_SECRET_KEY=5f895541-770e-47e1-84e2-96cf7caeac5e
STORAGE_BUCKET=vteemo-storage
ALLOWED_ORIGINS=https://vteemo-frontend.liara.run,https://vteemo.com,http://localhost:3000
```

## 🗄️ مرحله 3: Database Setup

1. **MySQL Database چک کن:**
   - تب "دیتابیس‌ها" → `vteemo-db`
   - مطمئن شو که running هست

2. **Database Migration:**
```bash
# از طریق terminal Liara یا local
liara shell --app vteemo-backend
npm run migrate
```

## ✅ مرحله 4: تست کردن

1. **Health Check:**
```bash
curl https://vteemo-backend.liara.run/health
```

2. **API Status:**
```bash
curl https://vteemo-backend.liara.run/api/status
```

3. **یا در مرورگر:**
   - https://vteemo-backend.liara.run
   - https://vteemo-backend.liara.run/health

## 🔧 Troubleshooting

### مشکل Database Connection:
```bash
liara logs --app vteemo-backend
```

### مشکل Environment Variables:
- چک کن همه vars در panel Liara تنظیم شده باشه
- مطمئن شو .env.production در کد موجود نیست

### مشکل Port:
- فقط port 3000 استفاده کن
- در liara.json و package.json یکسان باشه

## 📱 Auto Deploy

بعد از تنظیم GitHub integration:
1. هر تغییری که push کنی به GitHub
2. Automatically در Liara deploy میشه
3. نیازی به manual deploy نداری

## 🔄 بروزرسانی‌های بعدی:

```bash
# 1. تغییرات رو اعمال کن
# 2. Commit کن
git add .
git commit -m "✨ New feature description"

# 3. Push کن
git push origin main

# 4. Liara خودکار deploy می‌کنه!
```

## 🎯 URLs نهایی:

- **Backend API:** https://vteemo-backend.liara.run
- **GitHub Repo:** https://github.com/YourUsername/vteemo-backend
- **Liara Panel:** https://console.liara.ir/apps/vteemo-backend

---

**🎉 تبریک! Backend تو آماده استفاده هست!**