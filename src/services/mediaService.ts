import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3, buildPublicUrl } from '../config/storage';
import { insertMedia, findMediaByUUID } from '../repositories/mediaRepository';
import { nanoid } from 'nanoid';
import path from 'path';
import mime from 'mime-types';
import { getVideoQueue } from '../config/queue';
import { updateMediaStatus } from '../repositories/mediaRepository';

function parseMaxSize(input?: string) {
  if (!input) return 500 * 1024 * 1024;
  const m = /^(\d+)(KB|MB|GB)?$/i.exec(input);
  if (!m) return 500 * 1024 * 1024;
  const num = parseInt(m[1], 10);
  const unit = (m[2] || 'B').toUpperCase();
  const mult = unit === 'GB' ? 1024 ** 3 : unit === 'MB' ? 1024 ** 2 : unit === 'KB' ? 1024 : 1;
  return num * mult;
}

export const MAX_UPLOAD_BYTES = parseMaxSize(process.env.MAX_FILE_SIZE);

export async function uploadBuffer(userId: number | null, file: Express.Multer.File) {
  const bucket = process.env.STORAGE_BUCKET!;
  const ext = path.extname(file.originalname) || '.' + (mime.extension(file.mimetype) || 'bin');
  const short = nanoid(16);
  const kind = file.mimetype.startsWith('video/') ? 'video'
    : file.mimetype.startsWith('image/') ? 'image'
      : 'other';
  const key = `${kind}s/${short}${ext}`;

  const s3 = getS3();
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read'
  }));

  const media = await insertMedia({
    user_id: userId,
    original_name: file.originalname,
    storage_key: key,
    url: buildPublicUrl(key),
    mime_type: file.mimetype,
    type: kind,
    size_bytes: file.size,
    status: kind === 'video' ? 'processing' : 'uploaded'
  });
  if (kind === 'video') {
    try {
      await getVideoQueue().add('transcode', {
        mediaId: media!.id,
        key,
        mime: file.mimetype,
        originalName: file.original_name
      });
    } catch (e: any) {
      await updateMediaStatus(media!.id, 'failed', e.message);
    }
  }
  return media;
}

export async function getMedia(uuid: string) {
  const media = await findMediaByUUID(uuid);
  if (!media) {
    const err: any = new Error('Media not found');
    err.status = 404;
    throw err;
  }
  return media;
}
