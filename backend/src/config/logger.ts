import pino from 'pino';
import { env, isProd } from './env';

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  // Pretty-print in dev; structured JSON in prod (for log aggregators).
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      },
  base: { env: env.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.passwordHash',
      '*.password',
      '*.tokenHash',
    ],
    censor: '[REDACTED]',
  },
});
