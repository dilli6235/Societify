import { createApp } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { connectDatabase, disconnectDatabase } from '@/config/database';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  logger.info('✅ Database connected');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down…');
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Goodbye.');
      process.exit(0);
    });
    // Force-exit if graceful close hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
