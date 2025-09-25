import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { authGuard } from '../middleware/auth';
import { findPlanById, activateSubscription } from '../repositories/planRepository';
import { createPaymentTx, findByProviderExternal, markPaymentStatus, listUserPayments } from '../repositories/paymentRepository';
import { getUserActiveSubscription } from '../repositories/planRepository';

const router = Router();
const PROVIDER = process.env.PAYMENT_PROVIDER || 'mock';
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'dev_webhook_secret';

// ایجاد تراکنش (در mock فقط رکورد می‌سازد و external_id را برمی‌گرداند)
router.post('/checkout', authGuard, async (req, res, next) => {
  try {
    const schema = z.object({ plan_id: z.number() });
    const { plan_id } = schema.parse(req.body);
    const plan = await findPlanById(plan_id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const external_id = 'mock_' + Date.now() + '_' + Math.random().toString(16).slice(2);
    const tx = await createPaymentTx({
      user_id: req.user!.id,
      plan_id,
      provider: PROVIDER,
      external_id,
      status: 'pending',
      amount: plan.price,
      currency: 'IRR',
      meta: null
    });
    // در حالت واقعی: redirect/session_id
    res.status(201).json({ checkout: { external_id, tx_id: tx?.id, redirect_url: null } });
  } catch (e) {
    next(e);
  }
});

// webhook پرداخت (mock: باید body شامل external_id و status باشد)
router.post('/webhook', async (req, res, next) => {
  try {
    // امضای HMAC
    const signature = req.headers['x-webhook-signature'];
    const rawBody = JSON.stringify(req.body || {});
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
    if (signature !== expected) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const schema = z.object({
      external_id: z.string(),
      status: z.enum(['success', 'failed'])
    });
    const { external_id, status } = schema.parse(req.body);

    const tx = await findByProviderExternal(PROVIDER, external_id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    if (tx.status !== 'pending') {
      return res.json({ ok: true, already: true });
    }

    const updated = await markPaymentStatus(tx.id, status, { webhook_received_at: new Date().toISOString() });

    if (status === 'success') {
      // فعال‌سازی اشتراک
      const plan = await findPlanById(tx.plan_id);
      if (plan) {
        await activateSubscription(tx.user_id, plan.id, plan.duration_days);
      }
    }

    res.json({ ok: true, transaction: updated });
  } catch (e) {
    next(e);
  }
});

// لیست تراکنش‌های کاربر
router.get('/me', authGuard, async (req, res, next) => {
  try {
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    const payments = await listUserPayments(req.user!.id, limit, offset);
    const active = await getUserActiveSubscription(req.user!.id);
    res.json({ payments, active_subscription: active });
  } catch (e) {
    next(e);
  }
});

export default router;
