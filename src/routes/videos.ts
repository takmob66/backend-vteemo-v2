import { Router } from 'express';
import { authGuard, optionalAuthGuard } from '../middleware/auth.js';
import { 
  createVideo, 
  findVideoByUUID, 
  updateVideo,
  searchVideos,
  getTrendingVideos,
  getRecommendedVideos
} from '../repositories/videoRepository.js';
import { findChannelByUserId } from '../repositories/channelRepository.js';
import { findMediaByUUID } from '../repositories/mediaRepository.js';
import { 
  toggleVideoLike,
  addToFavorites,
  removeFromFavorites,
  getUserFavorites
} from '../repositories/interactionRepository.js';
import { recordVideoView } from '../repositories/viewRepository.js';

const router = Router();

// Create video from uploaded media
router.post('/', authGuard, async (req, res, next) => {
  try {
    const { 
      media_uuid, 
      title, 
      description, 
      tags, 
      category, 
      language,
      privacy,
      comments_enabled,
      age_restricted,
      scheduled_at
    } = req.body;
    
    if (!media_uuid || !title) {
      return res.status(400).json({ error: 'Media UUID and title are required' });
    }

    // Get user's channel
    const channel = await findChannelByUserId(req.user!.id);
    if (!channel) {
      return res.status(400).json({ error: 'You must create a channel first' });
    }

    // Verify media exists and belongs to user
    const media = await findMediaByUUID(media_uuid);
    if (!media || media.user_id !== req.user!.id) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const video = await createVideo({
      media_id: media.id,
      channel_id: channel.id,
      title,
      description,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      category,
      language,
      privacy,
      comments_enabled,
      age_restricted,
      scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined,
    });

    res.status(201).json({ video });
  } catch (e) {
    next(e);
  }
});

// Get video by UUID
router.get('/:uuid', optionalAuthGuard, async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const userId = req.user?.id;
    
    const video = await findVideoByUUID(uuid, userId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ video });
  } catch (e) {
    next(e);
  }
});

// Update video
router.put('/:uuid', authGuard, async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const { title, description, tags, category, privacy, comments_enabled, age_restricted, scheduled_at } = req.body;
    
    const video = await findVideoByUUID(uuid);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if user owns this video
    const channel = await findChannelByUserId(req.user!.id);
    if (!channel || video.channel_id !== channel.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedVideo = await updateVideo(video.id, {
      title,
      description,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      category,
      privacy,
      comments_enabled,
      age_restricted,
      scheduled_at: scheduled_at ? new Date(scheduled_at) : undefined,
    });

    res.json({ video: updatedVideo });
  } catch (e) {
    next(e);
  }
});

// Record video view
router.post('/:uuid/view', optionalAuthGuard, async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const { watch_time_seconds } = req.body;
    const userId = req.user?.id;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');
    
    const video = await findVideoByUUID(uuid);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const result = await recordVideoView({
      video_id: video.id,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      watch_time_seconds,
    });

    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Like/dislike video
router.post('/:uuid/like', authGuard, async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const { type } = req.body; // 'like' or 'dislike'
    
    if (!type || !['like', 'dislike'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "like" or "dislike"' });
    }

    const video = await findVideoByUUID(uuid);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const result = await toggleVideoLike(video.id, req.user!.id, type);
    
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Add to favorites
router.post('/:uuid/favorite', authGuard, async (req, res, next) => {
  try {
    const { uuid } = req.params;
    
    const video = await findVideoByUUID(uuid);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const result = await addToFavorites(video.id, req.user!.id);
    
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Remove from favorites
router.delete('/:uuid/favorite', authGuard, async (req, res, next) => {
  try {
    const { uuid } = req.params;
    
    const video = await findVideoByUUID(uuid);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const result = await removeFromFavorites(video.id, req.user!.id);
    
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Search videos
router.get('/', optionalAuthGuard, async (req, res, next) => {
  try {
    const query = String(req.query.q || '');
    const category = String(req.query.category || '');
    const duration = String(req.query.duration || '');
    const upload_date = String(req.query.upload_date || '');
    const sort_by = String(req.query.sort_by || 'relevance');
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    const userId = req.user?.id;
    
    const filters: any = {};
    if (category) filters.category = category;
    if (duration && ['short', 'medium', 'long'].includes(duration)) {
      filters.duration = duration as 'short' | 'medium' | 'long';
    }
    if (upload_date && ['hour', 'day', 'week', 'month', 'year'].includes(upload_date)) {
      filters.upload_date = upload_date as 'hour' | 'day' | 'week' | 'month' | 'year';
    }
    if (sort_by && ['relevance', 'upload_date', 'view_count', 'rating'].includes(sort_by)) {
      filters.sort_by = sort_by as 'relevance' | 'upload_date' | 'view_count' | 'rating';
    }

    const videos = await searchVideos(query, filters, limit, offset, userId);
    
    res.json({ 
      videos,
      paging: { limit, offset }
    });
  } catch (e) {
    next(e);
  }
});

export default router;