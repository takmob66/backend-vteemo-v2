import { Router, Request, Response, NextFunction } from 'express';
import { optionalAuthGuard } from '../middleware/auth.js';
import { 
  getTrendingVideos,
  getRecommendedVideos 
} from '../repositories/videoRepository.js';

const router = Router();

// Get trending videos
router.get('/trending', optionalAuthGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    const userId = req.user?.id;
    
    const videos = await getTrendingVideos(limit, offset, userId);
    
    res.json({ 
      videos,
      paging: { limit, offset }
    });
  } catch (e) {
    next(e);
  }
});

// Get recommended videos (personalized for logged in users)
router.get('/recommended', optionalAuthGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    const userId = req.user?.id;
    
    let videos;
    if (userId) {
      videos = await getRecommendedVideos(userId, limit, offset);
    } else {
      // For anonymous users, show trending videos
      videos = await getTrendingVideos(limit, offset);
    }
    
    res.json({ 
      videos,
      paging: { limit, offset }
    });
  } catch (e) {
    next(e);
  }
});

export default router;