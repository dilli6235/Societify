import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

/**
 * Seed baseline data:
 *   - subscription Plans (global catalog)
 *   - a platform SUPER_ADMIN
 *   - a demo society + its SOCIETY_ADMIN
 *
 * The app connects as a NOSUPERUSER role with FORCE RLS, so we open a
 * transaction and enable the bypass flag before writing tenant data.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const adminPassword = await argon2.hash('ChangeMe123!', { type: argon2.argon2id });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`;

    // ── Plans ──────────────────────────────────────────────────────────
    const [free] = await Promise.all([
      tx.plan.upsert({
        where: { name: 'Free' },
        update: {},
        create: { name: 'Free', priceMonthly: 0, maxUnits: 50, features: { gate: true, billing: false } },
      }),
      tx.plan.upsert({
        where: { name: 'Pro' },
        update: {},
        create: { name: 'Pro', priceMonthly: 4999, maxUnits: 500, features: { gate: true, billing: true, polls: true } },
      }),
      tx.plan.upsert({
        where: { name: 'Enterprise' },
        update: {},
        create: { name: 'Enterprise', priceMonthly: 19999, maxUnits: 100000, features: { all: true } },
      }),
    ]);

    // ── Platform SUPER_ADMIN (no society) ──────────────────────────────
    const superAdmin = await tx.user.findFirst({
      where: { email: 'superadmin@platform.local', societyId: null },
    });
    if (!superAdmin) {
      await tx.user.create({
        data: {
          societyId: null,
          email: 'superadmin@platform.local',
          fullName: 'Platform Super Admin',
          passwordHash: adminPassword,
          emailVerified: true,
          roles: { create: [{ role: 'SUPER_ADMIN' }] },
        },
      });
    }

    // ── Demo society + admin ───────────────────────────────────────────
    const society = await tx.society.upsert({
      where: { slug: 'greenwood-heights' },
      update: {},
      create: {
        name: 'Greenwood Heights',
        slug: 'greenwood-heights',
        addressLine1: '12 Garden Avenue',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        planId: free.id,
        subscriptionStatus: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
      },
    });

    const existingAdmin = await tx.user.findFirst({
      where: { email: 'admin@greenwood.local', societyId: society.id },
    });
    if (!existingAdmin) {
      await tx.user.create({
        data: {
          societyId: society.id,
          email: 'admin@greenwood.local',
          fullName: 'Greenwood Admin',
          passwordHash: adminPassword,
          emailVerified: true,
          roles: { create: [{ role: 'SOCIETY_ADMIN' }] },
        },
      });
    }
  });

  // eslint-disable-next-line no-console
  console.log('🌱 Seed complete.\n   Super admin: superadmin@platform.local / ChangeMe123!\n   Society admin (slug=greenwood-heights): admin@greenwood.local / ChangeMe123!');
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
