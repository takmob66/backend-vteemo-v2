import { getDB } from '../config/database.js';

const db = getDB();
const VIDEO_LIKES_TABLE = 'video_likes';
const SUBSCRIPTIONS_TABLE = 'channel_subscriptions';
const FAVORITES_TABLE = 'favorites';

export async function toggleVideoLike(videoId: number, userId: number, type: 'like' | 'dislike') {
  // Check if user already liked/disliked this video
  const existing = await db(VIDEO_LIKES_TABLE)
    .where({ video_id: videoId, user_id: userId })
    .first();

  if (existing) {
    if (existing.type === type) {
      // Remove the like/dislike
      await db(VIDEO_LIKES_TABLE)
        .where({ video_id: videoId, user_id: userId })
        .del();
      
      // Decrement count in videos table
      const field = type === 'like' ? 'likes_count' : 'dislikes_count';
      await db('videos')
        .where({ id: videoId })
        .decrement(field, 1);
      
      return { action: 'removed', type };
    } else {
      // Change like to dislike or vice versa
      await db(VIDEO_LIKES_TABLE)
        .where({ video_id: videoId, user_id: userId })
        .update({ type });
      
      // Update counts
      if (type === 'like') {
        await db('videos')
          .where({ id: videoId })
          .increment('likes_count', 1)
          .decrement('dislikes_count', 1);
      } else {
        await db('videos')
          .where({ id: videoId })
          .increment('dislikes_count', 1)
          .decrement('likes_count', 1);
      }
      
      return { action: 'changed', type };
    }
  } else {
    // Add new like/dislike
    await db(VIDEO_LIKES_TABLE).insert({
      video_id: videoId,
      user_id: userId,
      type,
    });
    
    // Increment count in videos table
    const field = type === 'like' ? 'likes_count' : 'dislikes_count';
    await db('videos')
      .where({ id: videoId })
      .increment(field, 1);
    
    return { action: 'added', type };
  }
}

export async function getUserVideoLike(videoId: number, userId: number) {
  const like = await db(VIDEO_LIKES_TABLE)
    .where({ video_id: videoId, user_id: userId })
    .first();
  
  return like?.type || null;
}

export async function subscribeToChannel(channelId: number, userId: number) {
  // Check if already subscribed
  const existing = await db(SUBSCRIPTIONS_TABLE)
    .where({ channel_id: channelId, user_id: userId })
    .first();

  if (existing) {
    return { subscribed: true, action: 'already_subscribed' };
  }

  await db(SUBSCRIPTIONS_TABLE).insert({
    channel_id: channelId,
    user_id: userId,
  });

  // Increment channel subscribers count
  await db('channels')
    .where({ id: channelId })
    .increment('subscribers_count', 1);

  return { subscribed: true, action: 'subscribed' };
}

export async function unsubscribeFromChannel(channelId: number, userId: number) {
  const deleted = await db(SUBSCRIPTIONS_TABLE)
    .where({ channel_id: channelId, user_id: userId })
    .del();

  if (deleted > 0) {
    // Decrement channel subscribers count
    await db('channels')
      .where({ id: channelId })
      .decrement('subscribers_count', 1);
    
    return { subscribed: false, action: 'unsubscribed' };
  }

  return { subscribed: false, action: 'not_subscribed' };
}

export async function getUserSubscriptionStatus(channelId: number, userId: number) {
  const subscription = await db(SUBSCRIPTIONS_TABLE)
    .where({ channel_id: channelId, user_id: userId })
    .first();
  
  return !!subscription;
}

export async function getUserSubscriptions(userId: number, limit = 20, offset = 0) {
  return db(SUBSCRIPTIONS_TABLE + ' as cs')
    .select([
      'c.*',
      'cs.notifications_enabled',
      'cs.created_at as subscribed_at'
    ])
    .leftJoin('channels as c', 'cs.channel_id', 'c.id')
    .where('cs.user_id', userId)
    .where('c.is_active', true)
    .orderBy('cs.created_at', 'desc')
    .limit(limit)
    .offset(offset);
}

export async function getChannelSubscribers(channelId: number, limit = 20, offset = 0) {
  return db(SUBSCRIPTIONS_TABLE + ' as cs')
    .select([
      'u.id',
      'u.uuid',
      'u.first_name',
      'u.last_name',
      'u.avatar_url',
      'cs.created_at as subscribed_at'
    ])
    .leftJoin('users as u', 'cs.user_id', 'u.id')
    .where('cs.channel_id', channelId)
    .orderBy('cs.created_at', 'desc')
    .limit(limit)
    .offset(offset);
}

export async function addToFavorites(videoId: number, userId: number) {
  // Check if already in favorites
  const existing = await db(FAVORITES_TABLE)
    .where({ video_id: videoId, user_id: userId })
    .first();

  if (existing) {
    return { favorited: true, action: 'already_favorited' };
  }

  await db(FAVORITES_TABLE).insert({
    video_id: videoId,
    user_id: userId,
  });

  return { favorited: true, action: 'added' };
}

export async function removeFromFavorites(videoId: number, userId: number) {
  const deleted = await db(FAVORITES_TABLE)
    .where({ video_id: videoId, user_id: userId })
    .del();

  if (deleted > 0) {
    return { favorited: false, action: 'removed' };
  }

  return { favorited: false, action: 'not_favorited' };
}

export async function getUserFavorites(userId: number, limit = 20, offset = 0) {
  return db(FAVORITES_TABLE + ' as f')
    .select([
      'v.*',
      'c.name as channel_name',
      'c.handle as channel_handle',
      'c.avatar_url as channel_avatar',
      'm.url as media_url',
      'm.thumbnails',
      'f.created_at as favorited_at'
    ])
    .leftJoin('videos as v', 'f.video_id', 'v.id')
    .leftJoin('channels as c', 'v.channel_id', 'c.id')
    .leftJoin('media as m', 'v.media_id', 'm.id')
    .where('f.user_id', userId)
    .where('v.privacy', 'public')
    .where('c.is_active', true)
    .orderBy('f.created_at', 'desc')
    .limit(limit)
    .offset(offset);
}

export async function isVideoFavorited(videoId: number, userId: number) {
  const favorite = await db(FAVORITES_TABLE)
    .where({ video_id: videoId, user_id: userId })
    .first();
  
  return !!favorite;
}