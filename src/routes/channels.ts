import { Router } from 'express';
import { authGuard } from '../middleware/auth.js';
import { 
  createChannel, 
  findChannelByUUID, 
  findChannelByHandle,
  findChannelByUserId,
  updateChannel,
  searchChannels,
  getPopularChannels
} from '../repositories/channelRepository.js';
import { getChannelVideos } from '../repositories/videoRepository.js';
import { 
  subscribeToChannel, 
  unsubscribeFromChannel,
  getUserSubscriptionStatus,
  getChannelSubscribers 
} from '../repositories/interactionRepository.js';
import { getChannelViewStats } from '../repositories/viewRepository.js';

const router = Router();

// Create channel
router.post('/', authGuard, async (req, res, next) => {
  try {
    const { name, handle, description } = req.body;
    
    if (!name || !handle) {
      return res.status(400).json({ error: 'Name and handle are required' });
    }

    // Check if user already has a channel
    const existingChannel = await findChannelByUserId(req.user!.id);
    if (existingChannel) {
      return res.status(409).json({ error: 'User already has a channel' });
    }

    const channel = await createChannel({
      user_id: req.user!.id,
      name,
      handle: handle.startsWith('@') ? handle : `@${handle}`,
      description,
    });

    res.status(201).json({ channel });
  } catch (e) {
    next(e);
  }
});

// Get current user's channel
router.get('/mine', authGuard, async (req, res, next) => {
  try {
    const channel = await findChannelByUserId(req.user!.id);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    res.json({ channel });
  } catch (e) {
    next(e);
  }
});

// Update current user's channel
router.put('/mine', authGuard, async (req, res, next) => {
  try {
    const channel = await findChannelByUserId(req.user!.id);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const { name, handle, description, avatar_url, banner_url } = req.body;
    
    const updatedChannel = await updateChannel(channel.id, {
      name,
      handle: handle?.startsWith('@') ? handle : handle ? `@${handle}` : undefined,
      description,
      avatar_url,
      banner_url,
    });

    res.json({ channel: updatedChannel });
  } catch (e) {
    next(e);
  }
});

// Get channel by UUID or handle
router.get('/:identifier', async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const userId = req.user?.id;
    
    let channel;
    if (identifier.startsWith('@')) {
      channel = await findChannelByHandle(identifier);
    } else {
      channel = await findChannelByUUID(identifier);
    }

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Get subscription status if user is logged in
    let isSubscribed = false;
    if (userId) {
      isSubscribed = await getUserSubscriptionStatus(channel.id, userId);
    }

    // Get channel statistics
    const stats = await getChannelViewStats(channel.id);

    res.json({ 
      channel: {
        ...channel,
        is_subscribed: isSubscribed,
        stats
      }
    });
  } catch (e) {
    next(e);
  }
});

// Get channel videos
router.get('/:identifier/videos', async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    const userId = req.user?.id;
    
    let channel;
    if (identifier.startsWith('@')) {
      channel = await findChannelByHandle(identifier);
    } else {
      channel = await findChannelByUUID(identifier);
    }

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const videos = await getChannelVideos(channel.id, limit, offset, userId);
    
    res.json({ 
      videos,
      paging: { limit, offset }
    });
  } catch (e) {
    next(e);
  }
});

// Subscribe to channel
router.post('/:identifier/subscribe', authGuard, async (req, res, next) => {
  try {
    const { identifier } = req.params;
    
    let channel;
    if (identifier.startsWith('@')) {
      channel = await findChannelByHandle(identifier);
    } else {
      channel = await findChannelByUUID(identifier);
    }

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Can't subscribe to own channel
    if (channel.user_id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot subscribe to your own channel' });
    }

    const result = await subscribeToChannel(channel.id, req.user!.id);
    
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Unsubscribe from channel
router.delete('/:identifier/subscribe', authGuard, async (req, res, next) => {
  try {
    const { identifier } = req.params;
    
    let channel;
    if (identifier.startsWith('@')) {
      channel = await findChannelByHandle(identifier);
    } else {
      channel = await findChannelByUUID(identifier);
    }

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const result = await unsubscribeFromChannel(channel.id, req.user!.id);
    
    res.json(result);
  } catch (e) {
    next(e);
  }
});

// Get channel subscribers (only for channel owners)
router.get('/:identifier/subscribers', authGuard, async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    
    let channel;
    if (identifier.startsWith('@')) {
      channel = await findChannelByHandle(identifier);
    } else {
      channel = await findChannelByUUID(identifier);
    }

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Only channel owner can see subscribers list
    if (channel.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const subscribers = await getChannelSubscribers(channel.id, limit, offset);
    
    res.json({ 
      subscribers,
      paging: { limit, offset }
    });
  } catch (e) {
    next(e);
  }
});

// Search channels
router.get('/', async (req, res, next) => {
  try {
    const query = String(req.query.q || '');
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    
    let channels;
    if (query) {
      channels = await searchChannels(query, limit, offset);
    } else {
      channels = await getPopularChannels(limit, offset);
    }
    
    res.json({ 
      channels,
      paging: { limit, offset }
    });
  } catch (e) {
    next(e);
  }
});

export default router;