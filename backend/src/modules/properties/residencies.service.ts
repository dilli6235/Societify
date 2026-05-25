import type { TenantClient } from '@/core/tenant/tenantPrisma';
import type { ResidencyRole } from '@prisma/client';
import { BadRequestError, NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';

interface ListParams {
  page?: number;
  pageSize?: number;
  unitId?: string;
  userId?: string;
  activeOnly?: boolean;
}

interface CreateInput {
  unitId: string;
  userId: string;
  role: ResidencyRole;
  isPrimary: boolean;
  movedInAt?: Date;
}

interface UpdateInput {
  role?: ResidencyRole;
  isPrimary?: boolean;
  movedInAt?: Date;
  movedOutAt?: Date | null;
}

class ResidencyService {
  /** The calling user's own active residencies (their unit[s]). */
  async listMine(db: TenantClient, userId: string) {
    return db.residency.findMany({
      where: { userId, movedOutAt: null },
      orderBy: { movedInAt: 'desc' },
      include: {
        unit: {
          select: { id: true, unitNumber: true, occupancyStatus: true, block: { select: { name: true } } },
        },
      },
    });
  }

  async list(db: TenantClient, params: ListParams) {
    const page = resolvePagination(params);
    const where = {
      ...(params.unitId ? { unitId: params.unitId } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.activeOnly ? { movedOutAt: null } : {}),
    };

    const [items, total] = await Promise.all([
      db.residency.findMany({
        where,
        orderBy: [{ movedOutAt: 'asc' }, { movedInAt: 'desc' }],
        skip: page.skip,
        take: page.take,
        include: {
          unit: { select: { id: true, unitNumber: true } },
          user: { select: { id: true, fullName: true, email: true, phone: true } },
        },
      }),
      db.residency.count({ where }),
    ]);

    return { items, meta: buildMeta(page, total) };
  }

  async getById(db: TenantClient, id: string) {
    const residency = await db.residency.findFirst({
      where: { id },
      include: {
        unit: { select: { id: true, unitNumber: true } },
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });
    if (!residency) throw new NotFoundError('Residency not found');
    return residency;
  }

  async create(db: TenantClient, societyId: string, input: CreateInput) {
    await this.assertUnitInTenant(db, input.unitId);
    await this.assertUserInTenant(db, input.userId);

    // One primary contact per unit: demote others first.
    if (input.isPrimary) {
      await db.residency.updateMany({
        where: { unitId: input.unitId, isPrimary: true, movedOutAt: null },
        data: { isPrimary: false },
      });
    }

    const residency = await db.residency.create({
      data: {
        societyId,
        unitId: input.unitId,
        userId: input.userId,
        role: input.role,
        isPrimary: input.isPrimary,
        movedInAt: input.movedInAt ?? new Date(),
      },
    });

    await this.recalcOccupancy(db, input.unitId);
    return residency;
  }

  async update(db: TenantClient, id: string, data: UpdateInput) {
    const existing = await this.getById(db, id);

    if (data.isPrimary) {
      await db.residency.updateMany({
        where: { unitId: existing.unitId, isPrimary: true, movedOutAt: null, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const updated = await db.residency.update({ where: { id }, data });
    await this.recalcOccupancy(db, existing.unitId);
    return updated;
  }

  /** Convenience: end a residency now (move-out). */
  async endResidency(db: TenantClient, id: string) {
    return this.update(db, id, { movedOutAt: new Date(), isPrimary: false });
  }

  async remove(db: TenantClient, id: string) {
    const existing = await this.getById(db, id);
    await db.residency.delete({ where: { id } });
    await this.recalcOccupancy(db, existing.unitId);
  }

  // ── internal ──────────────────────────────────────────────────────────

  private async assertUnitInTenant(db: TenantClient, unitId: string): Promise<void> {
    const unit = await db.unit.findFirst({ where: { id: unitId }, select: { id: true } });
    if (!unit) throw new BadRequestError('unitId does not reference a unit in this society');
  }

  private async assertUserInTenant(db: TenantClient, userId: string): Promise<void> {
    const user = await db.user.findFirst({ where: { id: userId }, select: { id: true } });
    if (!user) throw new BadRequestError('userId does not reference a user in this society');
  }

  /** Derive a unit's occupancy from its active residencies. */
  private async recalcOccupancy(db: TenantClient, unitId: string): Promise<void> {
    const active = await db.residency.findMany({
      where: { unitId, movedOutAt: null },
      select: { role: true },
    });

    const status = active.length === 0
      ? 'VACANT'
      : active.some((r) => r.role === 'OWNER')
        ? 'OWNER_OCCUPIED'
        : 'RENTED';

    await db.unit.update({ where: { id: unitId }, data: { occupancyStatus: status } });
  }
}

export const residencyService = new ResidencyService();
