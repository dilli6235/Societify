import { PrismaClient, type ExpenseCategory } from '@prisma/client';
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

    // ── Demo society data (units, residents, 6 months billing) ───────────
    // Idempotent: only seeded once, when the society has no units yet.
    const unitCount = await tx.unit.count({ where: { societyId: society.id } });
    if (unitCount === 0) {
      // Maintenance billing config (fixed ₹3,500/unit, due 10th).
      await tx.society.update({
        where: { id: society.id },
        data: {
          gstin: '29ABCDE1234F1Z5',
          maintenanceMethod: 'FIXED',
          maintenanceFixedAmount: 3500,
          maintenanceRatePerSqft: 3,
          dueDay: 10,
          gracePeriodDays: 5,
          lateFee: 200,
        },
      });

      const block = await tx.block.create({
        data: { societyId: society.id, name: 'Tower A', totalFloors: 12 },
      });

      const unitDefs = [
        { number: 'A-101', area: 980, rented: false, person: 'Vikram Nair' },
        { number: 'A-204', area: 1040, rented: true, person: 'Deepa Rao' },
        { number: 'B-112', area: 1040, rented: true, person: 'Rohan Sharma' },
        { number: 'C-307', area: 1240, rented: true, person: 'Anika Reddy', login: 'resident@greenwood.local' },
        { number: 'A-509', area: 980, rented: false, person: 'Priya Sharma' },
        { number: 'D-101', area: 1240, rented: false, person: 'Manish Banerjee' },
        { number: 'B-203', area: 1100, rented: true, person: 'Lakshmi Verma' },
        { number: 'C-410', area: 1180, rented: false, person: 'Naveen Pillai' },
      ];

      const now = new Date();
      const MAINT = 3500;
      let seq = 0;

      for (let idx = 0; idx < unitDefs.length; idx++) {
        const u = unitDefs[idx];
        const unit = await tx.unit.create({
          data: {
            societyId: society.id,
            blockId: block.id,
            unitNumber: u.number,
            floor: Number(u.number.split('-')[1].slice(0, 1)),
            type: 'APARTMENT',
            carpetAreaSqft: u.area,
            occupancyStatus: u.rented ? 'RENTED' : 'OWNER_OCCUPIED',
          },
        });

        // Primary occupant (a resident login) for this unit.
        const email = u.login ?? `${u.number.toLowerCase()}@greenwood.local`;
        const resident = await tx.user.create({
          data: {
            societyId: society.id,
            email,
            fullName: u.person,
            phone: `98${String(1000000 + idx * 11111).slice(0, 8)}`,
            passwordHash: adminPassword,
            emailVerified: true,
            roles: { create: [{ role: 'RESIDENT' }] },
          },
        });
        await tx.residency.create({
          data: {
            societyId: society.id,
            unitId: unit.id,
            userId: resident.id,
            role: u.rented ? 'TENANT' : 'OWNER',
            isPrimary: true,
            ...(u.rented ? { rentAmount: 24000, depositAmount: 120000 } : {}),
          },
        });

        // 6 months of invoices: past months paid; current month varies.
        for (let off = 5; off >= 0; off--) {
          const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - off, 1));
          const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - off + 1, 0, 23, 59, 59));
          const dueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - off, 10, 23, 59, 59));

          // Current month (off 0) status pattern: paid / issued / overdue.
          const phase = off > 0 ? 'paid' : (['paid', 'issued', 'overdue'] as const)[idx % 3];
          const isPaid = phase === 'paid';
          const status = isPaid ? 'PAID' : phase === 'overdue' ? 'OVERDUE' : 'ISSUED';

          seq++;
          await tx.maintenanceInvoice.create({
            data: {
              societyId: society.id,
              unitId: unit.id,
              invoiceNumber: `INV-${String(seq).padStart(6, '0')}`,
              status,
              billingPeriodStart: periodStart,
              billingPeriodEnd: periodEnd,
              issueDate: periodStart,
              dueDate,
              subtotal: MAINT,
              taxAmount: 0,
              lateFee: 0,
              totalAmount: MAINT,
              amountPaid: isPaid ? MAINT : 0,
              lineItems: {
                create: [{ societyId: society.id, description: 'Monthly maintenance', quantity: 1, unitPrice: MAINT, amount: MAINT }],
              },
              ...(isPaid
                ? {
                    payments: {
                      create: [{
                        societyId: society.id,
                        amount: MAINT,
                        method: idx % 2 === 0 ? 'UPI' : 'BANK_TRANSFER',
                        status: 'SUCCESS',
                        gatewayProvider: 'manual',
                        paidAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - off, 8)),
                      }],
                    },
                  }
                : {}),
            },
          });
        }
      }
      // Keep the per-society counter ahead of the seeded numbers.
      await tx.society.update({ where: { id: society.id }, data: { invoiceSeq: seq } });

      // ── Expenses across categories, last 6 months ──────────────────────
      const expenseTemplates: { category: ExpenseCategory; title: string; vendor: string; base: number }[] = [
        { category: 'SECURITY', title: 'Security guard salaries', vendor: 'SecureGuard Pvt Ltd', base: 96000 },
        { category: 'MAINTENANCE', title: 'Lift AMC', vendor: 'OtisCare Services', base: 42000 },
        { category: 'HOUSEKEEPING', title: 'Housekeeping', vendor: 'CleanPro Facility', base: 54000 },
        { category: 'UTILITIES', title: 'Water tanker supply', vendor: 'AquaSupply', base: 18500 },
        { category: 'MAINTENANCE', title: 'Garden upkeep', vendor: 'GreenThumb', base: 31000 },
      ];
      for (let off = 5; off >= 0; off--) {
        const when = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - off, 15));
        for (const t of expenseTemplates) {
          const jitter = 1 + ((off * 7 + t.base) % 11) / 100; // small deterministic variation
          await tx.expense.create({
            data: {
              societyId: society.id,
              category: t.category,
              title: t.title,
              vendorName: t.vendor,
              amount: Math.round(t.base * jitter),
              expenseDate: when,
              recordedById: existingAdmin?.id ?? (await tx.user.findFirstOrThrow({ where: { societyId: society.id, email: 'admin@greenwood.local' } })).id,
            },
          });
        }
      }
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
