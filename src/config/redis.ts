import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedis() {
  if (redis) return redis;
  if (!process.env.REDIS_HOST) {
    throw new Error('REDIS_HOST not set');
  }
  redis = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3
  });
  return redis;
}
