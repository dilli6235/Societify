import jwt, { type SignOptions } from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import type { SystemRole } from '@prisma/client';
import { env } from '@/config/env';
import { UnauthorizedError } from '@/core/errors/AppError';

export interface AccessTokenPayload {
  sub: string; // userId
  societyId: string | null;
  roles: SystemRole[];
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
    algorithm: 'HS256',
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

/**
 * Refresh tokens are opaque random strings (NOT JWTs). We store only their
 * SHA-256 hash in the DB, enabling rotation + server-side revocation. The raw
 * value lives only in the client's httpOnly cookie.
 */
export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(48).toString('base64url');
  return { raw, hash: hashRefreshToken(raw) };
}

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Parse durations like "15m", "7d", "24h", "30s" into milliseconds. */
export function parseDurationMs(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(value.trim());
  if (!match) throw new Error(`Invalid duration: ${value}`);
  const n = Number(match[1]);
  const unit = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return n * unit;
}
