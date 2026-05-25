import type { Prisma, SubscriptionStatus } from '@prisma/client';
import { prisma } from '@/config/database';
import { withBypass } from '@/core/tenant/rls';
import { NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';

/**
 * Platform service for the SUPER_ADMIN. These operations legitimately span all
 * tenants, so reads/writes that touch tenant tables run under `withBypass`.
 * `societies` and `plans` carry no RLS, so the base client is fine for those.
 */
class PlatformService {
  async stats() {
    return withBypass(async (tx) => {
      const [societies, activeSocieties, users, units, invoices] = await Promise.all([
        tx.society.count(),
        tx.society.count({ where: { subscriptionStatus: 'ACTIVE' } }),
        tx.user.count(),
        tx.unit.count(),
        tx.maintenanceInvoice.count(),
      ]);
      return { societies, activeSocieties, users, units, invoices };
    });
  }

  async listSocieties(params: { page?: number; pageSize?: number; search?: string; status?: SubscriptionStatus }) {
    const page = resolvePagination(params);
    const where: Prisma.SocietyWhereInput = {
      ...(params.status ? { subscriptionStatus: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { slug: { contains: params.search, mode: 'insensitive' } },
              { city: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return withBypass(async (tx) => {
      const [items, total] = await Promise.all([
        tx.society.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: page.skip,
          take: page.take,
          include: {
            plan: { select: { id: true, name: true } },
            _count: { select: { users: true, units: true } },
          },
        }),
        tx.society.count({ where }),
      ]);
      return { items, meta: buildMeta(page, total) };
    });
  }

  async getSociety(id: string) {
    const society = await withBypass((tx) =>
      tx.society.findUnique({
        where: { id },
        include: {
          plan: true,
          _count: { select: { users: true, units: true, blocks: true, invoices: true, complaints: true } },
        },
      }),
    );
    if (!society) throw new NotFoundError('Society not found');
    return society;
  }

  async updateSociety(id: string, data: { subscriptionStatus?: SubscriptionStatus; planId?: string | null }) {
    await this.getSociety(id);
    return withBypass((tx) => tx.society.update({ where: { id }, data, include: { plan: true } }));
  }

  // ── Plans (global catalog, no RLS) ────────────────────────────────────────

  listPlans() {
    return prisma.plan.findMany({ orderBy: { priceMonthly: 'asc' } });
  }

  createPlan(data: { name: string; priceMonthly: number; maxUnits: number; features: object; isActive: boolean }) {
    return prisma.plan.create({ data });
  }

  async updatePlan(id: string, data: Prisma.PlanUpdateInput) {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundError('Plan not found');
    return prisma.plan.update({ where: { id }, data });
  }

  async deletePlan(id: string) {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundError('Plan not found');
    await prisma.plan.delete({ where: { id } });
  }
}

export const platformService = new PlatformService();
