import { randomInt, randomBytes, createHash } from 'node:crypto';

/** Cryptographically-strong numeric OTP (default 6 digits) for gate passes etc. */
export function generateOtp(digits = 6): string {
  const max = 10 ** digits;
  return randomInt(0, max).toString().padStart(digits, '0');
}

/** URL-safe opaque token, e.g. for gate-pass QR codes or invite links. */
export function generateOpaqueToken(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

/** SHA-256 hex digest — store this, never the raw token. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
