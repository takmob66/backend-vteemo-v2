import { Queue } from 'bullmq';

let videoQueue: Queue | null = null;

function redisConnection() {
  if (!process.env.REDIS_HOST) throw new Error('Redis not configured');
  return {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined
  };
}

export function getVideoQueue() {
  if (videoQueue) return videoQueue;
  videoQueue = new Queue('video-processing', {
    connection: redisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 200
    }
  });
  return videoQueue;
}
