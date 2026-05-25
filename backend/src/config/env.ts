import 'dotenv/config';
import { z } from 'zod';

/**
 * Validate and freeze environment configuration at boot.
 * The process refuses to start with an invalid/missing config — fail fast.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be >= 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be >= 32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  COOKIE_SECRET: z.string().min(16),
  REFRESH_COOKIE_NAME: z.string().default('society_rt'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

  // Payments — Razorpay (optional; online payments disabled if unset).
  PAYMENT_PROVIDER: z.enum(['razorpay']).default('razorpay'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Public URL of the web dashboard — used to build invite/activation links.
  // On Render the dashboard is served same-origin, so default to the platform's
  // injected external URL when present.
  WEB_APP_URL: z.string().url().default(process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:5173'),
  // In production the API serves the built dashboard from this dir (same origin).
  STATIC_DIR: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),

  // Notifications (all optional; a channel is skipped if its config is absent).
  FCM_SERVER_KEY: z.string().optional(), // push via Firebase Cloud Messaging
  // Treat an empty string (blank in .env) as unset, then validate as email.
  EMAIL_FROM: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().email().optional(),
  ),
  // Real SMTP transport. Two ways to configure:
  //  (a) SMTP_URL=smtp://user:pass@host:587  (note: URL-encode @ in the user)
  //  (b) discrete fields below (preferred for Gmail — no encoding headaches)
  // If none are set in dev, an Ethereal test inbox is used automatically.
  SMTP_URL: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
  SMTP_PASS: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
