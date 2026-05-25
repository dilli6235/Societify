import type { TenantClient } from '@/core/tenant/tenantPrisma';
import type { OccupancyStatus, UnitType } from '@prisma/client';
import { BadRequestError, NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';

interface ListParams {
  page?: number;
  pageSize?: number;
  blockId?: string;
  occupancyStatus?: OccupancyStatus;
  search?: string;
}

interface CreateInput {
  blockId: string;
  unitNumber: string;
  floor?: number;
  type: UnitType;
  carpetAreaSqft?: number;
  occupancyStatus: OccupancyStatus;
}

type UpdateInput = Partial<Omit<CreateInput, 'type' | 'occupancyStatus'>> & {
  type?: UnitType;
  occupancyStatus?: OccupancyStatus;
  floor?: number | null;
  carpetAreaSqft?: number | null;
};

class UnitService {
  async list(db: TenantClient, params: ListParams) {
    const page = resolvePagination(params);
    const where = {
      ...(params.blockId ? { blockId: params.blockId } : {}),
      ...(params.occupancyStatus ? { occupancyStatus: params.occupancyStatus } : {}),
      ...(params.search
        ? { unitNumber: { contains: params.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.unit.findMany({
        where,
        orderBy: { unitNumber: 'asc' },
        skip: page.skip,
        take: page.take,
        include: { block: { select: { id: true, name: true } } },
      }),
      db.unit.count({ where }),
    ]);

    return { items, meta: buildMeta(page, total) };
  }

  async getById(db: TenantClient, id: string) {
    const unit = await db.unit.findFirst({
      where: { id },
      include: {
        block: { select: { id: true, name: true } },
        residencies: {
          where: { movedOutAt: null },
          include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
        },
      },
    });
    if (!unit) throw new NotFoundError('Unit not found');
    return unit;
  }

  async create(db: TenantClient, societyId: string, data: CreateInput) {
    await this.assertBlockInTenant(db, data.blockId);
    return db.unit.create({ data: { ...data, societyId } });
  }

  async update(db: TenantClient, id: string, data: UpdateInput) {
    await this.getById(db, id);
    if (data.blockId) await this.assertBlockInTenant(db, data.blockId);
    return db.unit.update({ where: { id }, data });
  }

  async remove(db: TenantClient, id: string) {
    await this.getById(db, id);
    await db.unit.delete({ where: { id } });
  }

  /**
   * Critical isolation check: FK constraints are validated by Postgres
   * regardless of RLS, so without this a tenant could attach a unit to another
   * tenant's block. The RLS-scoped lookup guarantees the block is ours.
   */
  private async assertBlockInTenant(db: TenantClient, blockId: string): Promise<void> {
    const block = await db.block.findFirst({ where: { id: blockId }, select: { id: true } });
    if (!block) throw new BadRequestError('blockId does not reference a block in this society');
  }
}

export const unitService = new UnitService();
