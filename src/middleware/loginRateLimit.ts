import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '300000', 10), // 5 دقیقه پیش‌فرض
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5', 10),
  message: { error: 'Too many login attempts. Try later.' },
  standardHeaders: true,
  legacyHeaders: false
});
