import { Redis } from 'ioredis';
import { env } from '@/config/env';

/**
 * Shared Redis connection for BullMQ. `maxRetriesPerRequest: null` is REQUIRED
 * by BullMQ (it manages blocking commands itself).
 */
export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
