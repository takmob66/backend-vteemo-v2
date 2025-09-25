import { Router, Request, Response, NextFunction } from 'express';
import { authGuard } from '../middleware/auth.js';
import { 
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../repositories/notificationRepository.js';

const router = Router();

// Get user notifications
router.get('/', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    
    const notifications = await getUserNotifications(req.user!.id, limit, offset);
    const unreadCount = await getUnreadNotificationsCount(req.user!.id);
    
    res.json({ 
      notifications,
      unread_count: unreadCount,
      paging: { limit, offset }
    });
  } catch (e) {
    next(e);
  }
});

// Get unread notifications count
router.get('/unread-count', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await getUnreadNotificationsCount(req.user!.id);
    res.json({ count });
  } catch (e) {
    next(e);
  }
});

// Mark notification as read
router.put('/:id/read', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    const success = await markNotificationAsRead(notificationId, req.user!.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ marked: true });
  } catch (e) {
    next(e);
  }
});

// Mark all notifications as read
router.put('/read-all', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await markAllNotificationsAsRead(req.user!.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Delete notification
router.delete('/:id', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    const success = await deleteNotification(notificationId, req.user!.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ deleted: true });
  } catch (e) {
    next(e);
  }
});

export default router;