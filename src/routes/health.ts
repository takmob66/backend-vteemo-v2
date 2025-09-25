import { Router } from 'express';
import { testConnection } from '../config/database';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    await testConnection();
    res.json({
      status: 'ok',
      version: process.env.APP_VERSION,
      time: new Date().toISOString()
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

export default router;
