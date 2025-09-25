import { S3Client } from '@aws-sdk/client-s3';

let s3: S3Client | null = null;

export function getS3() {
  if (s3) return s3;
  if (!process.env.STORAGE_ENDPOINT || !process.env.STORAGE_ACCESS_KEY || !process.env.STORAGE_SECRET_KEY || !process.env.STORAGE_BUCKET) {
    throw new Error('Storage env vars missing');
  }
  s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.STORAGE_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY,
      secretAccessKey: process.env.STORAGE_SECRET_KEY
    }
  });
  return s3;
}

export function buildPublicUrl(key: string) {
  if (process.env.STORAGE_PUBLIC_BASE_URL) {
    return `${process.env.STORAGE_PUBLIC_BASE_URL}/${key}`;
  }
  return `${process.env.STORAGE_ENDPOINT}/${process.env.STORAGE_BUCKET}/${key}`;
}
