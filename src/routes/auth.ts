import { Router } from 'express';
import { login, register, refresh, revokeAll } from '../services/authService';
import { authGuard } from '../middleware/auth';
import { loginRateLimiter } from '../middleware/loginRateLimit';
import { listSessions, revokeSessionById } from '../services/authService';
import { requestEmailVerification, confirmEmailVerification, forgotPassword, resetPassword } from '../services/authService';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const result = await register(req.body, req.ip, req.headers['user-agent']);
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.post('/login', loginRateLimiter, async (req, res, next) => {
  try {
    const result = await login(req.body, req.ip, req.headers['user-agent']);
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.body.refreshToken || req.headers['x-refresh-token'];
    const result = await refresh(String(token || ''), req.ip, req.headers['user-agent']);
    res.json(result);
  } catch (e) { next(e); }
});

// لیست سشن‌های فعال/قدیمی
router.get('/sessions', authGuard, async (req, res, next) => {
  try {
    const list = await listSessions(req.user!.id);
    res.json({ sessions: list });
  } catch (e) { next(e); }
});

// ابطال یک سشن
router.post('/sessions/revoke', authGuard, async (req, res, next) => {
  try {
    const id = Number(req.body.session_id);
    if (!id) return res.status(400).json({ error: 'session_id required' });
    await revokeSessionById(req.user!.id, id);
    res.json({ revoked: true });
  } catch (e) { next(e); }
});

// ابطال همه سشن‌ها
router.post('/sessions/revoke-all', authGuard, async (req, res, next) => {
  try {
    await revokeAll(req.user!.id);
    res.json({ revoked_all: true });
  } catch (e) { next(e); }
});

router.get('/me', authGuard, (req, res) => {
  res.json({ user: req.user });
});

// درخواست ارسال ایمیل برای تأیید
router.post('/verify/request', authGuard, async (req, res, next) => {
  try {
    const r = await requestEmailVerification(req.user!.id, req.user!.email);
    res.json(r);
  } catch (e) { next(e); }
});

// تأیید ایمیل
router.post('/verify/confirm', async (req, res, next) => {
  try {
    const token = String(req.body.token || '');
    const r = await confirmEmailVerification(token);
    res.json(r);
  } catch (e) { next(e); }
});

// فراموشی رمز عبور
router.post('/password/forgot', async (req, res, next) => {
  try {
    const email = String(req.body.email || '');
    const r = await forgotPassword(email);
    res.json(r);
  } catch (e) { next(e); }
});

// بازنشانی رمز عبور
router.post('/password/reset', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'token & password required' });
    const r = await resetPassword(String(token), String(password));
    res.json(r);
  } catch (e) { next(e); }
});

export default router;
