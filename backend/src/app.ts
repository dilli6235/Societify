import path from 'node:path';
import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { apiRouter } from '@/routes';
import { errorHandler, notFoundHandler } from '@/core/errors/errorHandler';
import { globalRateLimiter } from '@/middleware/rateLimit.middleware';

export function createApp(): Express {
  const app = express();

  // Behind a load balancer / reverse proxy in production (for correct req.ip
  // and secure-cookie handling).
  app.set('trust proxy', 1);

  // CSP disabled: this server also serves the SPA bundle; the default strict
  // CSP would block the app's own scripts/styles.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true, // allow the refresh cookie
    }),
  );
  app.use(
    express.json({
      limit: '1mb',
      // Capture the raw bytes so payment webhooks can verify HMAC signatures
      // against the exact payload the gateway signed (not re-serialized JSON).
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(pinoHttp({ logger }));
  app.use(globalRateLimiter);

  app.use(env.API_PREFIX, apiRouter);

  // In production, serve the built dashboard (same origin) with SPA fallback.
  if (env.STATIC_DIR) {
    const staticDir = path.resolve(env.STATIC_DIR);
    app.use(express.static(staticDir));
    app.get('*', (req, res, next) => {
      // Let unmatched API routes fall through to the JSON 404 handler.
      if (req.path.startsWith(env.API_PREFIX)) return next();
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
