# 🎬 VTEEMO Backend

پلتفرم ویدیویی کامل مشابه یوتیوب با قابلیت‌های پیشرفته

## ✨ ویژگی‌ها

- 🔐 **احراز هویت کامل** - ثبت‌نام، ورود، بازیابی رمز عبور
- 🎥 **مدیریت ویدیو** - آپلود، استریم، دانلود، پردازش
- 💬 **سیستم نظرات** - کامنت، پاسخ، لایک/دیسلایک  
- 👥 **مدیریت کاربران** - پروفایل، کانال، اشتراک
- 📊 **آنالیتیکس** - آمار بازدید، گزارش‌گیری
- 🔍 **جستجو پیشرفته** - فیلتر، دسته‌بندی
- 📱 **API RESTful** - مستندات کامل
- 🛡️ **امنیت** - Rate limiting, Helmet, CORS
- 📧 **ایمیل** - تأیید، بازیابی، اعلان‌ها
- ⚡ **Real-time** - Socket.io برای نوتیفیکیشن

## 🛠️ تکنولوژی‌ها

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL با Sequelize ORM
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer + Sharp
- **Video Processing**: FFmpeg
- **Real-time**: Socket.io
- **Email**: Nodemailer
- **Security**: Helmet, Rate Limiting
- **Logging**: Winston
- **Validation**: express-validator

## 📦 نصب و راه‌اندازی

### پیش‌نیازها

```bash
# Node.js 18 یا بالاتر
node --version

# MySQL Server
mysql --version

# FFmpeg (برای پردازش ویدیو)
ffmpeg -version
```

### مراحل نصب

1. **کلون پروژه**
```bash
git clone <repository-url>
cd vteemo-backend
```

2. **نصب dependencies**
```bash
npm install
```

3. **تنظیم Environment Variables**
```bash
cp .env.example .env
# ویرایش فایل .env با اطلاعات دیتابیس و سایر تنظیمات
```

4. **ایجاد دیتابیس MySQL**
```sql
CREATE DATABASE vteemo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. **اجرای سرور**
```bash
# حالت توسعه
npm run dev

# حالت تولید
npm start
```

## 🔧 تنظیمات Environment

فایل `.env` رو با اطلاعات زیر پیکربندی کنید:

```env
# سرور
NODE_ENV=development
PORT=5000

# دیتابیس MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=vteemo_db
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_key
JWT_REFRESH_SECRET=your_refresh_secret

# فرانت‌اند
FRONTEND_URL=https://vteemo.ir

# ایمیل (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | ثبت‌نام کاربر جدید |
| POST | `/api/auth/login` | ورود کاربر |
| POST | `/api/auth/logout` | خروج کاربر |
| GET | `/api/auth/me` | اطلاعات کاربر فعلی |
| PUT | `/api/auth/profile` | به‌روزرسانی پروفایل |
| PUT | `/api/auth/change-password` | تغییر رمز عبور |
| POST | `/api/auth/forgot-password` | بازیابی رمز عبور |
| PUT | `/api/auth/reset-password/:token` | تنظیم رمز جدید |

### Video Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/videos` | لیست ویدیوها |
| GET | `/api/videos/:id` | جزئیات ویدیو |
| POST | `/api/videos` | آپلود ویدیو |
| PUT | `/api/videos/:id` | ویرایش ویدیو |
| DELETE | `/api/videos/:id` | حذف ویدیو |
| GET | `/api/videos/:id/stream` | استریم ویدیو |

### سایر Endpoints

- **Users**: `/api/users`
- **Comments**: `/api/comments`
- **Playlists**: `/api/playlists`
- **Channels**: `/api/channels`
- **Search**: `/api/search`
- **Analytics**: `/api/analytics`
- **Upload**: `/api/upload`
- **Admin**: `/api/admin`

## 🔍 تست API

برای تست سریع:

```bash
# Health Check
curl http://localhost:5000/health

# ثبت‌نام کاربر جدید
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123456",
    "firstName": "Test",
    "lastName": "User"
  }'

# ورود
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

## 📁 ساختار پروژه

```
vteemo-backend/
├── config/          # تنظیمات (دیتابیس، لاگر، CORS)
├── controllers/     # کنترلرهای API
├── middleware/      # Middleware های سفارشی
├── models/          # مدل‌های دیتابیس (Sequelize)
├── routes/          # تعریف route ها
├── utils/           # ابزارهای کمکی (ایمیل، فایل)
├── uploads/         # فایل‌های آپلود شده
├── logs/            # فایل‌های لاگ
├── server.js        # فایل اصلی سرور
├── package.json     # Dependencies و scripts
└── .env.example     # نمونه environment variables
```

## 🚀 Deploy

### Docker

```bash
# ساخت Image
docker build -t vteemo-backend .

# اجرای Container
docker run -p 5000:5000 --env-file .env vteemo-backend
```

### Production

```bash
# نصب PM2
npm install -g pm2

# اجرا با PM2
pm2 start ecosystem.config.js
```

## 🤝 مشارکت

برای مشارکت در پروژه:

1. Fork کنید
2. Branch جدید بسازید (`git checkout -b feature/amazing-feature`)
3. تغییرات رو commit کنید (`git commit -m 'Add amazing feature'`)
4. Push کنید (`git push origin feature/amazing-feature`)
5. Pull Request بسازید

## 📄 مجوز

این پروژه تحت مجوز MIT منتشر شده است.

---

## 🎯 نکات مهم

### برای اتصال به فرانت‌اند vteemo.ir:

1. **CORS**: در `.env` آدرس فرانت رو اضافه کنید
2. **API Base URL**: فرانت باید به `http://your-server:5000/api` درخواست بفرسته
3. **Authentication**: از JWT token در header استفاده کنید

### برای MySQL:

```sql
-- ایجاد کاربر MySQL
CREATE USER 'vteemo'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON vteemo_db.* TO 'vteemo'@'localhost';
FLUSH PRIVILEGES;
```

---

**🎬 VTEEMO Backend - آماده برای اتصال به فرانت و استقرار!** 🚀
