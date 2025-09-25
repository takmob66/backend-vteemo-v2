import { Router } from 'express';
import { authGuard } from '../middleware/auth';
import { requireRole } from '../middleware/authz';
import {
  listUsers,
  findUserByUUID,
  updateUserRole,
  setUserActive,
  bumpRefreshVersion
} from '../repositories/userRepository';
import { z } from 'zod';

const router = Router();

// همه این مسیرها نیاز به ادمین
router.use(authGuard, requireRole('admin'));

router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    const search = req.query.search ? String(req.query.search) : undefined;
    const users = await listUsers({ limit, offset, search });
    res.json({ users, paging: { limit, offset } });
  } catch (e) {
    next(e);
  }
});

router.get('/:uuid', async (req, res, next) => {
  try {
    const u = await findUserByUUID(req.params.uuid);
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json({
      user: {
        uuid: u.uuid,
        email: u.email,
        role: u.role,
        is_active: !!u.is_active,
        last_login_at: u.last_login_at,
        created_at: u.created_at
      }
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/:uuid/role', async (req, res, next) => {
  try {
    const schema = z.object({ role: z.enum(['user', 'admin']) });
    const { role } = schema.parse(req.body);
    const u = await findUserByUUID(req.params.uuid);
    if (!u) return res.status(404).json({ error: 'Not found' });
    await updateUserRole(u.id, role);
    res.json({ updated: true, role });
  } catch (e) {
    next(e);
  }
});

router.patch('/:uuid/active', async (req, res, next) => {
  try {
    const schema = z.object({ is_active: z.boolean() });
    const { is_active } = schema.parse(req.body);
    const u = await findUserByUUID(req.params.uuid);
    if (!u) return res.status(404).json({ error: 'Not found' });
    await setUserActive(u.id, is_active);
    res.json({ updated: true, is_active });
  } catch (e) {
    next(e);
  }
});

router.post('/:uuid/revoke', async (req, res, next) => {
  try {
    const u = await findUserByUUID(req.params.uuid);
    if (!u) return res.status(404).json({ error: 'Not found' });
    await bumpRefreshVersion(u.id);
    res.json({ revoked: true });
  } catch (e) {
    next(e);
  }
});

export default router;
