import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

/**
 * All methods take the request's tenant-scoped client (`req.tenant.db`).
 * That client auto-injects `societyId` and runs under RLS, so these queries
 * never need to reference societyId explicitly — isolation is automatic.
 */
class BlockService {
  async list(db: TenantClient, params: ListParams) {
    const page = resolvePagination(params);
    const where = params.search
      ? { name: { contains: params.search, mode: 'insensitive' as const } }
      : {};

    const [items, total] = await Promise.all([
      db.block.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: page.skip,
        take: page.take,
        include: { _count: { select: { units: true } } },
      }),
      db.block.count({ where }),
    ]);

    return { items, meta: buildMeta(page, total) };
  }

  async getById(db: TenantClient, id: string) {
    const block = await db.block.findFirst({
      where: { id },
      include: { _count: { select: { units: true } } },
    });
    if (!block) throw new NotFoundError('Block not found');
    return block;
  }

  async create(db: TenantClient, societyId: string, data: { name: string; totalFloors?: number }) {
    // Uniqueness is enforced by @@unique([societyId, name]) → P2002 → 409.
    return db.block.create({ data: { ...data, societyId } });
  }

  async update(
    db: TenantClient,
    id: string,
    data: { name?: string; totalFloors?: number | null },
  ) {
    await this.getById(db, id); // 404 if not in this tenant
    return db.block.update({ where: { id }, data });
  }

  async remove(db: TenantClient, id: string) {
    await this.getById(db, id);
    // Block has units with a required relation; deletion will fail (P2003) if
    // units exist — surfaced as a clean 400 by the error handler.
    await db.block.delete({ where: { id } });
  }
}

export const blockService = new BlockService();
