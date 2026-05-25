import type { SystemRole } from '@prisma/client';
import type { TenantClient } from '../tenant/tenantPrisma';

/**
 * Request-scoped authentication + tenant context, populated by middleware:
 *   auth.middleware    -> req.auth   (who)
 *   tenant.middleware  -> req.tenant (which society + scoped Prisma client)
 */
export interface AuthContext {
  userId: string;
  societyId: string | null; // null only for platform SUPER_ADMIN
  roles: SystemRole[];
}

export interface TenantContext {
  societyId: string;
  /** Prisma client scoped to this society (RLS + auto-filtering). */
  db: TenantClient;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
      tenant?: TenantContext;
    }
  }
}

export {};
