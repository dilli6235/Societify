import { Queue } from 'bullmq';
import { redisConnection } from './connection';
import { logger } from '@/config/logger';
import type { NotificationJob } from '@/integrations/notifications';

export const NOTIFICATIONS_QUEUE = 'notifications';

/** Producer side — imported by domain services to fan out notifications. */
export const notificationsQueue = new Queue(NOTIFICATIONS_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3_000 },
    removeOnComplete: 500,
    removeOnFail: 1000,
  },
});

/**
 * Enqueue a notification. Fire-and-forget: a failure here (e.g. Redis down)
 * is logged but never propagates, so it can't break the user's request.
 */
export async function enqueueNotification(job: NotificationJob): Promise<void> {
  if (job.recipientUserIds.length === 0) return;
  try {
    await notificationsQueue.add('notify', job);
  } catch (err) {
    logger.error({ err, event: job.event }, 'Failed to enqueue notification');
  }
}
