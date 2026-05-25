import { PrismaClient } from '@prisma/client';
import { isProd } from './env';

/**
 * Base Prisma client singleton.
 *
 * This is the RAW client. Do NOT use it directly inside request handlers for
 * tenant-scoped data — go through `tenantPrisma(societyId)` (see core/tenant)
 * so Row-Level Security is set and tenant filters are auto-applied.
 *
 * Direct use is allowed only for:
 *   - auth/login lookups (before a tenant is known)
 *   - platform SUPER_ADMIN operations (with explicit bypass)
 *   - migrations / seeds
 */
const createPrisma = () =>
  new PrismaClient({
    log: isProd ? ['warn', 'error'] : ['warn', 'error'],
  });

// Avoid exhausting connections during hot-reload in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrisma();

if (!isProd) globalForPrisma.prisma = prisma;

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
