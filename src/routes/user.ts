import { Router, Request, Response, NextFunction } from 'express';
import { authGuard } from '../middleware/auth.js';
import { 
  getUserSubscriptions,
  getUserFavorites 
} from '../repositories/interactionRepository.js';
import { getViewHistory, clearUserViewHistory } from '../repositories/viewRepository.js';

const router = Router();

// Get user subscriptions
router.get('/subscriptions', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    
    const subscriptions = await getUserSubscriptions(req.user!.id, limit, offset);
    
    res.json({ 
      subscriptions,
      paging: { limit, offset }
    });
  } catch (e) {
    next(e);
  }
});

// Get user favorites
router.get('/favorites', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    
    const favorites = await getUserFavorites(req.user!.id, limit, offset);
    
    res.json({ 
      favorites,
      paging: { limit, offset }
    });
  } catch (e) {
    next(e);
  }
});

// Get user view history
router.get('/history', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(String(req.query.limit || '50'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    
    const history = await getViewHistory(req.user!.id, limit, offset);
    
    res.json({ 
      history,
      paging: { limit, offset }
    });
  } catch (e) {
    next(e);
  }
});

// Clear user view history
router.delete('/history', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await clearUserViewHistory(req.user!.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

export default router;