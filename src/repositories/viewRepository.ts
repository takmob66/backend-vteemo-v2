import { getDB } from '../config/database.js';

const db = getDB();
const TABLE = 'video_views';

export interface VideoViewRecord {
  id: number;
  video_id: number;
  user_id?: number;
  ip_address?: string;
  user_agent?: string;
  watch_time_seconds?: number;
  created_at: Date;
}

export async function recordVideoView(data: {
  video_id: number;
  user_id?: number;
  ip_address?: string;
  user_agent?: string;
  watch_time_seconds?: number;
}) {
  // Check for recent view from same user/ip to prevent spam
  const recentThreshold = new Date();
  recentThreshold.setMinutes(recentThreshold.getMinutes() - 5); // 5 minutes

  let existingView = null;

  if (data.user_id) {
    existingView = await db(TABLE)
      .where({ video_id: data.video_id, user_id: data.user_id })
      .where('created_at', '>=', recentThreshold)
      .first();
  } else if (data.ip_address) {
    existingView = await db(TABLE)
      .where({ video_id: data.video_id, ip_address: data.ip_address })
      .where('created_at', '>=', recentThreshold)
      .first();
  }

  if (existingView) {
    // Update existing view with new watch time if provided
    if (data.watch_time_seconds !== undefined) {
      await db(TABLE)
        .where({ id: existingView.id })
        .update({ watch_time_seconds: data.watch_time_seconds });
    }
    return { recorded: false, reason: 'recent_view_exists' };
  }

  // Record new view
  await db(TABLE).insert({
    video_id: data.video_id,
    user_id: data.user_id || null,
    ip_address: data.ip_address || null,
    user_agent: data.user_agent || null,
    watch_time_seconds: data.watch_time_seconds || null,
  });

  // Increment view count in videos table
  await db('videos')
    .where({ id: data.video_id })
    .increment('views_count', 1);

  // Also increment channel views count
  const video = await db('videos').where({ id: data.video_id }).first();
  if (video) {
    await db('channels')
      .where({ id: video.channel_id })
      .increment('views_count', 1);
  }

  return { recorded: true };
}

export async function getVideoViewStats(videoId: number) {
  const [totalViews, uniqueUsers, avgWatchTime] = await Promise.all([
    db(TABLE).where({ video_id: videoId }).count('id as count').first(),
    db(TABLE).where({ video_id: videoId }).whereNotNull('user_id').countDistinct('user_id as count').first(),
    db(TABLE)
      .where({ video_id: videoId })
      .whereNotNull('watch_time_seconds')
      .avg('watch_time_seconds as avg')
      .first()
  ]);

  return {
    total_views: Number(totalViews?.count || 0),
    unique_users: Number(uniqueUsers?.count || 0),
    avg_watch_time: Number(avgWatchTime?.avg || 0)
  };
}

export async function getChannelViewStats(channelId: number) {
  // Get views for all videos in this channel
  const result = await db(TABLE + ' as vv')
    .count('vv.id as total_views')
    .countDistinct('vv.user_id as unique_viewers')
    .avg('vv.watch_time_seconds as avg_watch_time')
    .leftJoin('videos as v', 'vv.video_id', 'v.id')
    .where('v.channel_id', channelId)
    .first();

  return {
    total_views: Number(result?.total_views || 0),
    unique_viewers: Number(result?.unique_viewers || 0),
    avg_watch_time: Number(result?.avg_watch_time || 0)
  };
}

export async function getViewHistory(userId: number, limit = 50, offset = 0) {
  return db(TABLE + ' as vv')
    .select([
      'v.*',
      'c.name as channel_name',
      'c.handle as channel_handle',
      'c.avatar_url as channel_avatar',
      'm.url as media_url',
      'm.thumbnails',
      'vv.watch_time_seconds',
      'vv.created_at as viewed_at'
    ])
    .leftJoin('videos as v', 'vv.video_id', 'v.id')
    .leftJoin('channels as c', 'v.channel_id', 'c.id')
    .leftJoin('media as m', 'v.media_id', 'm.id')
    .where('vv.user_id', userId)
    .where('v.privacy', 'public')
    .where('c.is_active', true)
    .orderBy('vv.created_at', 'desc')
    .limit(limit)
    .offset(offset);
}

export async function clearUserViewHistory(userId: number) {
  await db(TABLE).where({ user_id: userId }).del();
  return { cleared: true };
}