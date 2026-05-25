import { Prisma } from '@prisma/client';
import { prisma } from '@/config/database';

/**
 * Helpers for running raw, interactive transactions with the correct RLS
 * session context. Used where the `tenantPrisma` extension isn't a fit:
 *   - login (look up a user before a request-tenant exists)
 *   - platform SUPER_ADMIN operations that legitimately cross tenants
 *
 * Because the app connects as a NOSUPERUSER role with FORCE ROW LEVEL
 * SECURITY, an unset tenant context means ZERO rows are visible — secure by
 * default. You must opt into a scope explicitly via one of these helpers.
 */

type Tx = Prisma.TransactionClient;

/** Run `fn` with the tenant scoped to a specific society. */
export function withSociety<T>(societyId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_society_id', ${societyId}, true)`;
    return fn(tx);
  });
}

/**
 * Run `fn` with RLS bypassed — for platform SUPER_ADMIN only. Every caller
 * MUST have already verified SUPER_ADMIN authorization. Pair with an audit log.
 */
export function withBypass<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;
    return fn(tx);
  });
}
