import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '@/utils/jwt';
import { UnauthorizedError } from '@/core/errors/AppError';

/**
 * Verify the Bearer access token and populate `req.auth`.
 * Does NOT establish a tenant scope — that's `tenant.middleware`.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing Bearer token');
  }

  const token = header.slice('Bearer '.length).trim();
  const payload = verifyAccessToken(token);

  req.auth = {
    userId: payload.sub,
    societyId: payload.societyId,
    roles: payload.roles,
  };

  next();
}
