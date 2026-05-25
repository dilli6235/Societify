import type { Job } from 'bullmq';
import { deliverNotification, type NotificationJob } from '@/integrations/notifications';

export async function runNotification(job: Job): Promise<void> {
  await deliverNotification(job.data as NotificationJob);
}
