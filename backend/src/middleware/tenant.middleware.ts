import type { NextFunction, Request, Response } from 'express';
import { tenantPrisma } from '@/core/tenant/tenantPrisma';
import { ForbiddenError, UnauthorizedError } from '@/core/errors/AppError';

/**
 * Establish the tenant scope for the request. Must run AFTER `authenticate`.
 *
 * The society is taken ONLY from the verified token (`req.auth.societyId`) —
 * never from a header, query param, or body. This is the single most important
 * rule for preventing cross-tenant access.
 *
 * Attaches `req.tenant.db`, a Prisma client that enforces RLS + auto-filters.
 */
export function withTenant(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    throw new UnauthorizedError();
  }

  const { societyId } = req.auth;
  if (!societyId) {
    // SUPER_ADMIN has no home society; they must use platform routes that
    // explicitly opt into a scope or bypass — not generic tenant routes.
    throw new ForbiddenError('This endpoint requires a society-scoped account');
  }

  req.tenant = {
    societyId,
    db: tenantPrisma(societyId),
  };

  next();
}
