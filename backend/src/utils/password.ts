import argon2 from 'argon2';

/**
 * Password hashing with Argon2id — the current OWASP-recommended algorithm.
 * Parameters are sane defaults; tune `memoryCost`/`timeCost` to your hardware.
 */
const ARGON_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON_OPTS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
