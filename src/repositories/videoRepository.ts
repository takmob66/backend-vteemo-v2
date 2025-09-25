import { getDB } from '../config/database.js';

const db = getDB();
const TABLE = 'videos';

export interface VideoRecord {
  id: number;
  uuid: string;
  media_id: number;
  channel_id: number;
  title: string;
  description?: string;
  tags?: string; // JSON string
  category?: string;
  language: string;
  privacy: 'public' | 'unlisted' | 'private';
  views_count: number;
  likes_count: number;
  dislikes_count: number;
  comments_count: number;
  duration_seconds?: number;
  comments_enabled: boolean;
  is_monetized: boolean;
  age_restricted: boolean;
  published_at?: Date;
  scheduled_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface VideoWithDetails extends VideoRecord {
  // Joined data
  media?: any;
  channel?: any;
  user_like?: 'like' | 'dislike' | null;
  is_favorited?: boolean;
}

export async function createVideo(data: {
  media_id: number;
  channel_id: number;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  language?: string;
  privacy?: 'public' | 'unlisted' | 'private';
  comments_enabled?: boolean;
  age_restricted?: boolean;
  scheduled_at?: Date;
}) {
  const insertData = {
    media_id: data.media_id,
    channel_id: data.channel_id,
    title: data.title,
    description: data.description || null,
    tags: data.tags ? JSON.stringify(data.tags) : null,
    category: data.category || null,
    language: data.language || 'fa',
    privacy: data.privacy || 'public',
    comments_enabled: data.comments_enabled ?? true,
    age_restricted: data.age_restricted ?? false,
    scheduled_at: data.scheduled_at || null,
    published_at: data.privacy === 'public' && !data.scheduled_at ? db.fn.now() : null,
  };

  const [id] = await db(TABLE).insert(insertData);
  return db<VideoRecord>(TABLE).where({ id }).first();
}

export async function findVideoByUUID(uuid: string, userId?: number) {
  const query = db<VideoWithDetails>(TABLE + ' as v')
    .select([
      'v.*',
      'c.name as channel_name',
      'c.handle as channel_handle',
      'c.avatar_url as channel_avatar',
      'c.subscribers_count as channel_subscribers',
      'u.first_name as user_first_name',
      'u.last_name as user_last_name',
      'm.url as media_url',
      'm.thumbnails',
      'm.processed_variants',
      'm.duration_seconds as media_duration',
    ])
    .leftJoin('channels as c', 'v.channel_id', 'c.id')
    .leftJoin('users as u', 'c.user_id', 'u.id')
    .leftJoin('media as m', 'v.media_id', 'm.id')
    .where('v.uuid', uuid);

  if (userId) {
    query
      .select([
        db.raw(`(
          SELECT type FROM video_likes 
          WHERE video_id = v.id AND user_id = ? 
          LIMIT 1
        ) as user_like`, [userId]),
        db.raw(`(
          SELECT COUNT(*) > 0 FROM favorites 
          WHERE video_id = v.id AND user_id = ?
        ) as is_favorited`, [userId])
      ]);
  }

  return query.first();
}

export async function updateVideo(id: number, data: {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  privacy?: 'public' | 'unlisted' | 'private';
  comments_enabled?: boolean;
  age_restricted?: boolean;
  scheduled_at?: Date;
}) {
  const updateData: any = { ...data };
  
  if (data.tags) {
    updateData.tags = JSON.stringify(data.tags);
  }

  // If changing to public and no scheduled time, publish now
  if (data.privacy === 'public' && !data.scheduled_at) {
    updateData.published_at = db.fn.now();
  }

  updateData.updated_at = db.fn.now();
  
  await db(TABLE).where({ id }).update(updateData);
  return db<VideoRecord>(TABLE).where({ id }).first();
}

export async function incrementVideoStats(videoId: number, stats: {
  views_count?: number;
  likes_count?: number;
  dislikes_count?: number;
  comments_count?: number;
}) {
  const updates: any = {};
  
  if (stats.views_count) {
    updates.views_count = db.raw(`views_count + ${stats.views_count}`);
  }
  if (stats.likes_count) {
    updates.likes_count = db.raw(`likes_count + ${stats.likes_count}`);
  }
  if (stats.dislikes_count) {
    updates.dislikes_count = db.raw(`dislikes_count + ${stats.dislikes_count}`);
  }
  if (stats.comments_count) {
    updates.comments_count = db.raw(`comments_count + ${stats.comments_count}`);
  }

  if (Object.keys(updates).length > 0) {
    await db(TABLE).where({ id: videoId }).update(updates);
  }
}

export async function searchVideos(
  query: string, 
  filters: {
    category?: string;
    duration?: 'short' | 'medium' | 'long';
    upload_date?: 'hour' | 'day' | 'week' | 'month' | 'year';
    sort_by?: 'relevance' | 'upload_date' | 'view_count' | 'rating';
  } = {},
  limit = 20, 
  offset = 0,
  userId?: number
) {
  let dbQuery = db<VideoWithDetails>(TABLE + ' as v')
    .select([
      'v.*',
      'c.name as channel_name',
      'c.handle as channel_handle',
      'c.avatar_url as channel_avatar',
      'm.url as media_url',
      'm.thumbnails',
    ])
    .leftJoin('channels as c', 'v.channel_id', 'c.id')
    .leftJoin('media as m', 'v.media_id', 'm.id')
    .where('v.privacy', 'public')
    .where('c.is_active', true);

  // Search in title, description, tags
  if (query) {
    dbQuery = dbQuery.where((builder) => {
      builder
        .where('v.title', 'like', `%${query}%`)
        .orWhere('v.description', 'like', `%${query}%`)
        .orWhere('v.tags', 'like', `%${query}%`)
        .orWhere('c.name', 'like', `%${query}%`);
    });
  }

  // Apply filters
  if (filters.category) {
    dbQuery = dbQuery.where('v.category', filters.category);
  }

  if (filters.duration) {
    switch (filters.duration) {
      case 'short':
        dbQuery = dbQuery.where('v.duration_seconds', '<', 240); // < 4 min
        break;
      case 'medium':
        dbQuery = dbQuery.whereBetween('v.duration_seconds', [240, 1200]); // 4-20 min
        break;
      case 'long':
        dbQuery = dbQuery.where('v.duration_seconds', '>', 1200); // > 20 min
        break;
    }
  }

  if (filters.upload_date) {
    const now = new Date();
    let timeAgo: Date;
    
    switch (filters.upload_date) {
      case 'hour':
        timeAgo = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        timeAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        timeAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        timeAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        timeAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeAgo = new Date(0);
    }
    
    dbQuery = dbQuery.where('v.published_at', '>=', timeAgo);
  }

  // Apply sorting
  switch (filters.sort_by) {
    case 'upload_date':
      dbQuery = dbQuery.orderBy('v.published_at', 'desc');
      break;
    case 'view_count':
      dbQuery = dbQuery.orderBy('v.views_count', 'desc');
      break;
    case 'rating':
      dbQuery = dbQuery.orderByRaw('(v.likes_count - v.dislikes_count) DESC');
      break;
    default: // relevance
      if (query) {
        // Simple relevance scoring
        dbQuery = dbQuery.orderByRaw(`
          CASE 
            WHEN v.title LIKE ? THEN 3
            WHEN c.name LIKE ? THEN 2
            ELSE 1
          END DESC, v.views_count DESC
        `, [`%${query}%`, `%${query}%`]);
      } else {
        dbQuery = dbQuery.orderBy('v.views_count', 'desc');
      }
      break;
  }

  if (userId) {
    dbQuery = dbQuery.select([
      db.raw(`(
        SELECT type FROM video_likes 
        WHERE video_id = v.id AND user_id = ? 
        LIMIT 1
      ) as user_like`, [userId]),
      db.raw(`(
        SELECT COUNT(*) > 0 FROM favorites 
        WHERE video_id = v.id AND user_id = ?
      ) as is_favorited`, [userId])
    ]);
  }

  return dbQuery.limit(limit).offset(offset);
}

export async function getChannelVideos(channelId: number, limit = 20, offset = 0, userId?: number) {
  let query = db<VideoWithDetails>(TABLE + ' as v')
    .select([
      'v.*',
      'm.url as media_url',
      'm.thumbnails',
    ])
    .leftJoin('media as m', 'v.media_id', 'm.id')
    .where('v.channel_id', channelId)
    .where('v.privacy', 'public')
    .orderBy('v.published_at', 'desc');

  if (userId) {
    query = query.select([
      db.raw(`(
        SELECT type FROM video_likes 
        WHERE video_id = v.id AND user_id = ? 
        LIMIT 1
      ) as user_like`, [userId]),
      db.raw(`(
        SELECT COUNT(*) > 0 FROM favorites 
        WHERE video_id = v.id AND user_id = ?
      ) as is_favorited`, [userId])
    ]);
  }

  return query.limit(limit).offset(offset);
}

export async function getTrendingVideos(limit = 20, offset = 0, userId?: number) {
  // Simple trending algorithm - videos with most views in last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  let query = db<VideoWithDetails>(TABLE + ' as v')
    .select([
      'v.*',
      'c.name as channel_name',
      'c.handle as channel_handle',
      'c.avatar_url as channel_avatar',
      'm.url as media_url',
      'm.thumbnails',
    ])
    .leftJoin('channels as c', 'v.channel_id', 'c.id')
    .leftJoin('media as m', 'v.media_id', 'm.id')
    .where('v.privacy', 'public')
    .where('c.is_active', true)
    .where('v.published_at', '>=', weekAgo)
    .orderBy('v.views_count', 'desc');

  if (userId) {
    query = query.select([
      db.raw(`(
        SELECT type FROM video_likes 
        WHERE video_id = v.id AND user_id = ? 
        LIMIT 1
      ) as user_like`, [userId]),
      db.raw(`(
        SELECT COUNT(*) > 0 FROM favorites 
        WHERE video_id = v.id AND user_id = ?
      ) as is_favorited`, [userId])
    ]);
  }

  return query.limit(limit).offset(offset);
}

export async function getRecommendedVideos(userId: number, limit = 20, offset = 0) {
  // Simple recommendation - videos from subscribed channels + popular videos
  return db<VideoWithDetails>(TABLE + ' as v')
    .select([
      'v.*',
      'c.name as channel_name',
      'c.handle as channel_handle',
      'c.avatar_url as channel_avatar',
      'm.url as media_url',
      'm.thumbnails',
      db.raw(`(
        SELECT type FROM video_likes 
        WHERE video_id = v.id AND user_id = ? 
        LIMIT 1
      ) as user_like`, [userId]),
      db.raw(`(
        SELECT COUNT(*) > 0 FROM favorites 
        WHERE video_id = v.id AND user_id = ?
      ) as is_favorited`, [userId])
    ])
    .leftJoin('channels as c', 'v.channel_id', 'c.id')
    .leftJoin('media as m', 'v.media_id', 'm.id')
    .leftJoin('channel_subscriptions as cs', function() {
      this.on('cs.channel_id', '=', 'v.channel_id')
          .andOn('cs.user_id', '=', db.raw('?', [userId]));
    })
    .where('v.privacy', 'public')
    .where('c.is_active', true)
    .orderByRaw('CASE WHEN cs.user_id IS NOT NULL THEN 1 ELSE 2 END, v.views_count DESC')
    .limit(limit)
    .offset(offset);
}

export async function deleteVideo(id: number) {
  await db(TABLE).where({ id }).del();
}