import { getDB } from '../config/database';

const db = getDB();
const TABLE = 'media';

export interface MediaRecord {
  id: number;
  uuid: string;
  user_id: number | null;
  original_name: string;
  storage_key: string;
  url: string;
  mime_type: string;
  type: string;
  size_bytes: number;
  status: string;
  created_at: Date;
  updated_at: Date;
  // فیلدهای احتمالی که در migrations قبلی اضافه شده‌اند:
  duration_seconds?: number | null;
  width?: number | null;
  height?: number | null;
  processed_variants?: string | null;
  processing_errors?: string | null;
  thumbnails?: string | null;
}

export async function insertMedia(data: Omit<MediaRecord, 'id' | 'uuid' | 'created_at' | 'updated_at'>) {
  const insertData: any = {
    user_id: data.user_id,
    original_name: data.original_name,
    storage_key: data.storage_key,
    url: data.url,
    mime_type: data.mime_type,
    type: data.type,
    size_bytes: data.size_bytes,
    status: data.status
  };
  const [id] = await db(TABLE).insert(insertData);
  return db<MediaRecord>(TABLE).where({ id }).first();
}

export async function findMediaByUUID(uuid: string) {
  return db<MediaRecord>(TABLE).where({ uuid }).first();
}

export async function listUserMedia(userId: number, limit = 20, offset = 0) {
  return db<MediaRecord>(TABLE)
    .where({ user_id: userId })
    .whereNot({ status: 'deleted' })
    .orderBy('id', 'desc')
    .limit(limit)
    .offset(offset);
}

export async function updateMediaStatus(id: number, status: string, error?: string) {
  await db(TABLE).where({ id }).update({
    status,
    processing_errors: error ? db.raw('COALESCE(processing_errors, "") || ?', [`\n${error}`]) : undefined
  });
}

export async function setMediaMetadata(id: number, meta: {
  duration_seconds?: number;
  width?: number;
  height?: number;
}) {
  await db(TABLE).where({ id }).update(meta);
}

export async function saveVariants(id: number, variants: Array<any>) {
  await db(TABLE).where({ id }).update({
    processed_variants: JSON.stringify(variants),
    status: 'ready'
  });
}

export async function saveThumbnails(id: number, thumbs: Array<any>) {
  await db(TABLE).where({ id }).update({
    thumbnails: JSON.stringify(thumbs)
  });
}

export async function getMediaById(id: number) {
  return db<MediaRecord>(TABLE).where({ id }).first();
}

export async function softDeleteMedia(uuid: string, userId: number, isAdmin: boolean) {
  const row = await findMediaByUUID(uuid);
  if (!row) return null;
  if (!isAdmin && row.user_id !== userId) {
    const err: any = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  await db(TABLE).where({ id: row.id }).update({ status: 'deleted' });
  return { deleted: true };
}
