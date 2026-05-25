import { Worker, type Job } from 'bullmq';
import { SCHEDULED_QUEUE, JobName, registerSchedules, type InvoiceGenerationData } from './queues';
import { NOTIFICATIONS_QUEUE } from './notificationQueue';
import { redisConnection } from './connection';
import { runGatePassExpiry, runOverdueSweep } from './processors/housekeeping.processor';
import { runInvoiceGeneration } from './processors/invoiceGeneration.processor';
import { runNotification } from './processors/notification.processor';
import { connectDatabase, disconnectDatabase } from '@/config/database';
import { logger } from '@/config/logger';

/**
 * Standalone worker process (`npm run worker`). Runs separately from the API so
 * heavy/scheduled work never blocks request handling and can scale on its own.
 */
async function processJob(job: Job): Promise<unknown> {
  switch (job.name) {
    case JobName.OverdueSweep:
      return runOverdueSweep();
    case JobName.GatePassExpiry:
      return runGatePassExpiry();
    case JobName.InvoiceGeneration:
      return runInvoiceGeneration(job.data as InvoiceGenerationData);
    default:
      logger.warn({ name: job.name }, 'Unknown job — skipped');
      return undefined;
  }
}

async function bootstrap(): Promise<void> {
  await connectDatabase();
  await registerSchedules();

  const scheduledWorker = new Worker(SCHEDULED_QUEUE, processJob, {
    connection: redisConnection,
    concurrency: 5,
  });

  // Dedicated worker for the (higher-volume) notification queue.
  const notificationWorker = new Worker(NOTIFICATIONS_QUEUE, runNotification, {
    connection: redisConnection,
    concurrency: 20,
  });

  for (const w of [scheduledWorker, notificationWorker]) {
    w.on('completed', (job, result) => logger.info({ job: job.name, id: job.id, result }, 'Job completed'));
    w.on('failed', (job, err) => logger.error({ job: job?.name, id: job?.id, err }, 'Job failed'));
  }

  logger.info('🛠️  Worker started; schedules registered; notification consumer live');

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Worker shutting down…');
    await Promise.all([scheduledWorker.close(), notificationWorker.close()]);
    await redisConnection.quit();
    await disconnectDatabase();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Worker failed to start');
  process.exit(1);
});
