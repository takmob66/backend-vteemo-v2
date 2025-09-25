import { Router } from 'express';
import multer from 'multer';
import { authGuard } from '../middleware/auth';
import { uploadBuffer, getMedia, MAX_UPLOAD_BYTES } from '../services/mediaService';
import { listUserMedia, softDeleteMedia } from '../repositories/mediaRepository';
import { getRedis } from '../config/redis';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES }
});

router.post('/upload', authGuard, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      const err: any = new Error('File required');
      err.status = 400;
      throw err;
    }
    const media = await uploadBuffer(req.user?.id || null, req.file);
    res.status(201).json({ media });
  } catch (e) {
    next(e);
  }
});

router.get('/', authGuard, async (req, res, next) => {
  try {
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    const items = await listUserMedia(req.user!.id, limit, offset);
    res.json({ media: items, paging: { limit, offset } });
  } catch (e) {
    next(e);
  }
});

router.delete('/:uuid', authGuard, async (req, res, next) => {
  try {
    const result = await softDeleteMedia(req.params.uuid, req.user!.id, req.user!.role === 'admin');
    if (!result) return res.status(404).json({ error: 'Not found' });
    // Invalidate cache
    try {
      const redis = getRedis();
      await redis.del(`media:${req.params.uuid}`);
    } catch { /* ignore */ }
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get('/:uuid', async (req, res, next) => {
  try {
    const uuid = req.params.uuid;
    const cacheKey = `media:${uuid}`;
    let cached: any = null;
    try {
      const redis = getRedis();
      const c = await redis.get(cacheKey);
      if (c) cached = JSON.parse(c);
    } catch { /* ignore */ }
    if (cached) return res.json({ media: cached, cached: true });

    const media = await getMedia(uuid);
    const ttl = parseInt(process.env.MEDIA_CACHE_TTL || '60', 10);
    try {
      const redis = getRedis();
      await redis.setex(cacheKey, ttl, JSON.stringify(media));
    } catch { /* ignore */ }
    res.json({ media, cached: false });
  } catch (e) {
    next(e);
  }
});

router.get('/:uuid/status', async (req, res, next) => {
  try {
    const media = await getMedia(req.params.uuid);
    if (!media) return res.status(404).json({ error: 'Not found' });
    res.json({
      status: media.status,
      variants: media.processed_variants ? JSON.parse(media.processed_variants) : []
    });
  } catch (e) {
    next(e);
  }
});

export default router;
