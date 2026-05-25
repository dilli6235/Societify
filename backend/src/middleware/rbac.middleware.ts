import type { NextFunction, Request, Response } from 'express';
import type { SystemRole } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '@/core/errors/AppError';

/**
 * Authorize the request if the user holds AT LEAST ONE of the allowed roles.
 * Usage:  router.post('/', authenticate, requireRole('SOCIETY_ADMIN'), handler)
 */
export function requireRole(...allowed: SystemRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) throw new UnauthorizedError();

    const hasRole = req.auth.roles.some((r) => allowed.includes(r));
    if (!hasRole) {
      throw new ForbiddenError(
        `Requires one of: ${allowed.join(', ')}`,
      );
    }
    next();
  };
}
