import { Router } from 'express';
import { authGuard, optionalAuthGuard } from '../middleware/auth.js';
import { 
  createComment,
  getVideoComments,
  getCommentReplies,
  findCommentByUUID,
  updateComment,
  deleteComment,
  toggleCommentLike,
  pinComment,
  getUserComments
} from '../repositories/commentRepository.js';
import { findVideoByUUID } from '../repositories/videoRepository.js';
import { findChannelByUserId } from '../repositories/channelRepository.js';

const router = Router();

// Create comment
router.post('/', authGuard, async (req, res, next) => {
  try {
    const { video_uuid, parent_uuid, content } = req.body;
    
    if (!video_uuid || !content) {
      return res.status(400).json({ error: 'Video UUID and content are required' });
    }

    const video = await findVideoByUUID(video_uuid);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (!video.comments_enabled) {
      return res.status(403).json({ error: 'Comments are disabled for this video' });
    }

    let parentId = null;
    if (parent_uuid) {
      const parentComment = await findCommentByUUID(parent_uuid);
      if (!parentComment || parentComment.video_id !== video.id) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
      parentId = parentComment.id;
    }

    const comment = await createComment({
      video_id: video.id,
      user_id: req.user!.id,
      parent_id: parentId,
      content,
    });

    res.status(201).json({ comment });
  } catch (e) {
    next(e);
  }
});

// Get video comments
router.get('/video/:video_uuid', optionalAuthGuard, async (req, res, next) => {
  try {
    const { video_uuid } = req.params;
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    const userId = req.user?.id;
    
    const video = await findVideoByUUID(video_uuid);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const comments = await getVideoComments(video.id, userId, limit, offset);
    
    res.json({ 
      comments,
      paging: { limit, offset }
    });
  } catch (e) {
    next(e);
  }
});

// Get comment replies
router.get('/:uuid/replies', optionalAuthGuard, async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const limit = parseInt(String(req.query.limit || '10'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    const userId = req.user?.id;
    
    const comment = await findCommentByUUID(uuid);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const replies = await getCommentReplies(comment.id, userId, limit, offset);
    
    res.json({ 
      replies,
      paging: { limit, offset }
    });
  } catch (e) {
    next(e);
  }
});

// Update comment
router.put('/:uuid', authGuard, async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const comment = await findCommentByUUID(uuid);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedComment = await updateComment(comment.id, content);
    
    res.json({ comment: updatedComment });
  } catch (e) {
    next(e);
  }
});

// Delete comment
router.delete('/:uuid', authGuard, async (req, res, next) => {
  try {
    const { uuid } = req.params;
    
    const comment = await findCommentByUUID(uuid);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const result = await deleteComment(comment.id, req.user!.id, req.user!.role === 'admin');
    
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Like/dislike comment
router.post('/:uuid/like', authGuard, async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const { type } = req.body; // 'like' or 'dislike'
    
    if (!type || !['like', 'dislike'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "like" or "dislike"' });
    }

    const comment = await findCommentByUUID(uuid);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const result = await toggleCommentLike(comment.id, req.user!.id, type);
    
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Pin comment (only video owner)
router.post('/:uuid/pin', authGuard, async (req, res, next) => {
  try {
    const { uuid } = req.params;
    
    const comment = await findCommentByUUID(uuid);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Get user's channel
    const channel = await findChannelByUserId(req.user!.id);
    if (!channel) {
      return res.status(403).json({ error: 'You must have a channel to pin comments' });
    }

    const result = await pinComment(comment.id, comment.video_id, channel.id, req.user!.id);
    
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Get user's comments
router.get('/user/mine', authGuard, async (req, res, next) => {
  try {
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    
    const comments = await getUserComments(req.user!.id, limit, offset);
    
    res.json({ 
      comments,
      paging: { limit, offset }
    });
  } catch (e) {
    next(e);
  }
});

export default router;