import { Router } from 'express';
import { authGuard } from '../middleware/auth';
import { listPlans, findPlanById, createSubscription, getUserActiveSubscription } from '../repositories/planRepository';
import { z } from 'zod';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const plans = await listPlans();
    res.json({ plans });
  } catch (e) {
    next(e);
  }
});

router.get('/me', authGuard, async (req, res, next) => {
  try {
    const sub = await getUserActiveSubscription(req.user!.id);
    res.json({ subscription: sub });
  } catch (e) {
    next(e);
  }
});

// خرید اشتراک (نمونه: فقط ثبت رکورد، پرداخت واقعی باید webhook داشته باشد)
router.post('/subscribe', authGuard, async (_req, res) => {
  res.status(400).json({ error: 'Use /payments/checkout instead' });
});

export default router;
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const now = new Date();
    const end = new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);
    const sub = await createSubscription(req.user!.id, plan_id, now, end);
    res.status(201).json({ subscription: sub });
  } catch (e) {
    next(e);
  }
});

export default router;
