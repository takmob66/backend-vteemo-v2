import 'dotenv/config';
import { Worker, QueueScheduler } from 'bullmq';
import { getVideoQueue } from '../config/queue';
import { getDB } from '../config/database';
import { getMediaById, updateMediaStatus, saveVariants, setMediaMetadata, saveThumbnails } from '../repositories/mediaRepository';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { buildPublicUrl, getS3 } from '../config/storage';
import { randomUUID } from 'crypto';
import os from 'os';
import fs from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || ffmpegInstaller.path);
(ffmpeg as any).setFfprobePath(process.env.FFPROBE_PATH || ffprobeInstaller.path);

// Ensure DB init
getDB();

new QueueScheduler('video-processing', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined
  }
});

getVideoQueue(); // ensure queue exists

const qualities = (process.env.VIDEO_VARIANTS || '360p,480p').split(',').map(q => q.trim()).filter(Boolean);

interface JobData {
  mediaId: number;
  key: string;
  mime: string;
  originalName: string;
}

function parseQuality(q: string) {
  const m = /^(\d+)p$/i.exec(q);
  return m ? parseInt(m[1], 10) : null;
}

async function downloadToTemp(s3: S3Client, bucket: string, key: string) {
  const tmpFile = path.join(os.tmpdir(), `${randomUUID()}_${path.basename(key)}`);
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const stream = obj.Body as any;
  const write = fs.createWriteStream(tmpFile);
  await new Promise((resolve, reject) => {
    stream.pipe(write);
    stream.on('error', reject);
    write.on('finish', resolve);
    write.on('error', reject);
  });
  return tmpFile;
}

async function transcodeVariant(inputFile: string, targetHeight: number, outDir: string) {
  const outFile = path.join(outDir, `${targetHeight}p.mp4`);
  return new Promise<{ file: string; width: number; height: number; }>((resolve, reject) => {
    ffmpeg(inputFile)
      .videoCodec('libx264')
      .size(`?x${targetHeight}`)
      .outputOptions(['-preset veryfast', '-movflags +faststart'])
      .on('error', reject)
      .on('end', () => {
        // Width detection could be improved - placeholder
        resolve({ file: outFile, width: 0, height: targetHeight });
      })
      .save(outFile);
  });
}

async function probeVideo(file: string): Promise<{ duration?: number; width?: number; height?: number; }> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(file, (err, data) => {
      if (err) return resolve({});
      const stream = data.streams?.find(s => s.width && s.height) as any;
      resolve({
        duration: data.format?.duration ? Math.round(data.format.duration) : undefined,
        width: stream?.width,
        height: stream?.height
      });
    });
  });
}

async function generateThumbnails(inputFile: string, outDir: string, count: number) {
  return new Promise<string[]>((resolve, reject) => {
    ffmpeg(inputFile)
      .on('error', reject)
      .on('end', () => {
        const files = ((): string[] => {
          return require('fs').readdirSync(outDir)
            .filter((f: string) => f.startsWith('thumb-') && f.endsWith('.jpg'))
            .map((f: string) => f);
        })();
        resolve(files);
      })
      .screenshots({
        count,
        filename: 'thumb-%03d.jpg',
        folder: outDir,
        size: '320x?'
      });
  });
}

async function processVideo(jobData: JobData) {
  const media = await getMediaById(jobData.mediaId);
  if (!media) throw new Error('Media not found');
  await updateMediaStatus(media.id, 'processing');

  const bucket = process.env.STORAGE_BUCKET!;
  const s3 = getS3();
  const tmpInput = await downloadToTemp(s3, bucket, jobData.key);
  const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), 'vproc_'));

  const variants: any[] = [];
  try {
    for (const q of qualities) {
      const h = parseQuality(q);
      if (!h) continue;
      const result = await transcodeVariant(tmpInput, h, tmpOut);
      const variantKey = `videos/${path.basename(jobData.key, path.extname(jobData.key))}_${h}p.mp4`;
      const body = fs.readFileSync(result.file);
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: variantKey,
        Body: body,
        ContentType: 'video/mp4',
        ACL: 'public-read'
      }));
      variants.push({
        quality: `${h}p`,
        url: buildPublicUrl(variantKey),
        width: result.width || null,
        height: result.height
      });
    }

    // استخراج متادیتا
    const meta = await probeVideo(tmpInput);
    if (meta.duration || meta.width || meta.height) {
      await setMediaMetadata(media.id, {
        duration_seconds: meta.duration,
        width: meta.width,
        height: meta.height
      });
    }

    // تولید Thumbnail فقط اگر ویدئو
    const thumbCount = parseInt(process.env.THUMBNAIL_COUNT || '3', 10);
    const thumbsLocal = await generateThumbnails(tmpInput, tmpOut, thumbCount);
    const thumbsMeta: any[] = [];
    for (const fileName of thumbsLocal) {
      const localPath = path.join(tmpOut, fileName);
      const thumbKey = `thumbnails/${path.basename(jobData.key, path.extname(jobData.key))}_${fileName}`;
      const body = fs.readFileSync(localPath);
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: thumbKey,
        Body: body,
        ContentType: 'image/jpeg',
        ACL: 'public-read'
      }));
      thumbsMeta.push({ url: buildPublicUrl(thumbKey) });
    }
    if (thumbsMeta.length) {
      await saveThumbnails(media.id, thumbsMeta);
    }

    await saveVariants(media.id, variants);
  } catch (e: any) {
    await updateMediaStatus(media.id, 'failed', e.message);
    throw e;
  } finally {
    // cleanup
    try { fs.unlinkSync(tmpInput); } catch { /* ignore */ }
    try {
      for (const f of fs.readdirSync(tmpOut)) {
        fs.unlinkSync(path.join(tmpOut, f));
      }
      fs.rmdirSync(tmpOut);
    } catch { /* ignore */ }
  }
}

new Worker<JobData>('video-processing', async (job) => {
  await processVideo(job.data);
}, {
  concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '2', 10),
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined
  }
});

console.log('[Worker] videoProcessor started');
