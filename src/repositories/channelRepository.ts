import { getDB } from '../config/database.js';

const db = getDB();
const TABLE = 'channels';

export interface ChannelRecord {
  id: number;
  uuid: string;
  user_id: number;
  name: string;
  handle: string;
  description?: string;
  avatar_url?: string;
  banner_url?: string;
  subscribers_count: number;
  videos_count: number;
  views_count: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function createChannel(data: {
  user_id: number;
  name: string;
  handle: string;
  description?: string;
}) {
  // Check if handle already exists
  const existing = await db(TABLE).where({ handle: data.handle }).first();
  if (existing) {
    const err: any = new Error('Handle already exists');
    err.status = 409;
    throw err;
  }

  const [id] = await db(TABLE).insert({
    user_id: data.user_id,
    name: data.name,
    handle: data.handle,
    description: data.description || null,
  });
  
  return db<ChannelRecord>(TABLE).where({ id }).first();
}

export async function findChannelByUUID(uuid: string) {
  return db<ChannelRecord>(TABLE)
    .where({ uuid })
    .where({ is_active: true })
    .first();
}

export async function findChannelByHandle(handle: string) {
  return db<ChannelRecord>(TABLE)
    .where({ handle })
    .where({ is_active: true })
    .first();
}

export async function findChannelByUserId(userId: number) {
  return db<ChannelRecord>(TABLE)
    .where({ user_id: userId })
    .where({ is_active: true })
    .first();
}

export async function updateChannel(id: number, data: {
  name?: string;
  handle?: string;
  description?: string;
  avatar_url?: string;
  banner_url?: string;
}) {
  // Check if new handle already exists
  if (data.handle) {
    const existing = await db(TABLE)
      .where({ handle: data.handle })
      .where('id', '!=', id)
      .first();
    if (existing) {
      const err: any = new Error('Handle already exists');
      err.status = 409;
      throw err;
    }
  }

  await db(TABLE).where({ id }).update({
    ...data,
    updated_at: db.fn.now(),
  });
  
  return db<ChannelRecord>(TABLE).where({ id }).first();
}

export async function incrementChannelStats(channelId: number, stats: {
  subscribers_count?: number;
  videos_count?: number;
  views_count?: number;
}) {
  const updates: any = {};
  
  if (stats.subscribers_count) {
    updates.subscribers_count = db.raw(`subscribers_count + ${stats.subscribers_count}`);
  }
  if (stats.videos_count) {
    updates.videos_count = db.raw(`videos_count + ${stats.videos_count}`);
  }
  if (stats.views_count) {
    updates.views_count = db.raw(`views_count + ${stats.views_count}`);
  }

  if (Object.keys(updates).length > 0) {
    await db(TABLE).where({ id: channelId }).update(updates);
  }
}

export async function searchChannels(query: string, limit = 20, offset = 0) {
  return db<ChannelRecord>(TABLE)
    .where({ is_active: true })
    .where((builder) => {
      builder
        .where('name', 'like', `%${query}%`)
        .orWhere('handle', 'like', `%${query}%`)
        .orWhere('description', 'like', `%${query}%`);
    })
    .orderBy('subscribers_count', 'desc')
    .limit(limit)
    .offset(offset);
}

export async function getPopularChannels(limit = 20, offset = 0) {
  return db<ChannelRecord>(TABLE)
    .where({ is_active: true })
    .orderBy('subscribers_count', 'desc')
    .limit(limit)
    .offset(offset);
}

export async function softDeleteChannel(id: number) {
  await db(TABLE).where({ id }).update({ is_active: false });
}