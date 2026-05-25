import { Queue } from 'bullmq';
import { redisConnection } from './connection';

export const SCHEDULED_QUEUE = 'scheduled-jobs';

export enum JobName {
  OverdueSweep = 'overdue-sweep',
  GatePassExpiry = 'gatepass-expiry',
  InvoiceGeneration = 'invoice-generation',
}

export interface InvoiceGenerationData {
  amount: number;
  description: string;
}

/** The single queue carrying all platform-wide scheduled jobs. */
export const scheduledQueue = new Queue(SCHEDULED_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

/**
 * Register (idempotent) repeatable schedulers. Cron times are UTC.
 *   - overdue sweep      : daily 02:00
 *   - gate-pass expiry   : hourly
 *   - invoice generation : 1st of month 01:00
 */
export async function registerSchedules(): Promise<void> {
  await scheduledQueue.upsertJobScheduler(
    'overdue-daily',
    { pattern: '0 2 * * *' },
    { name: JobName.OverdueSweep },
  );

  await scheduledQueue.upsertJobScheduler(
    'gatepass-expiry-hourly',
    { pattern: '0 * * * *' },
    { name: JobName.GatePassExpiry },
  );

  await scheduledQueue.upsertJobScheduler(
    'invoice-monthly',
    { pattern: '0 1 1 * *' },
    {
      name: JobName.InvoiceGeneration,
      data: { amount: 1500, description: 'Monthly maintenance charge' } satisfies InvoiceGenerationData,
    },
  );
}
