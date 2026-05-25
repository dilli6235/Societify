import type { Prisma, SosStatus, SosType } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { ConflictError, NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';

class SosService {
  /** Any resident can raise an emergency alert. */
  async raise(db: TenantClient, societyId: string, raisedById: string, input: { type: SosType; message?: string; location?: string }) {
    return db.sosAlert.create({
      data: { societyId, raisedById, type: input.type, message: input.message, location: input.location, status: 'ACTIVE' },
    });
  }

  async list(db: TenantClient, params: { page?: number; pageSize?: number; status?: SosStatus }) {
    const page = resolvePagination(params);
    const where: Prisma.SosAlertWhereInput = params.status ? { status: params.status } : {};
    const [items, total] = await Promise.all([
      db.sosAlert.findMany({
        where,
        // Active first, then newest.
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: page.skip,
        take: page.take,
      }),
      db.sosAlert.count({ where }),
    ]);
    return { items, meta: buildMeta(page, total) };
  }

  async acknowledge(db: TenantClient, id: string, actorId: string) {
    const alert = await db.sosAlert.findFirst({ where: { id }, select: { id: true, status: true } });
    if (!alert) throw new NotFoundError('Alert not found');
    if (alert.status !== 'ACTIVE') throw new ConflictError(`Alert is already ${alert.status}`);
    return db.sosAlert.update({ where: { id }, data: { status: 'ACKNOWLEDGED', acknowledgedById: actorId } });
  }

  async resolve(db: TenantClient, id: string) {
    const alert = await db.sosAlert.findFirst({ where: { id }, select: { id: true, status: true } });
    if (!alert) throw new NotFoundError('Alert not found');
    if (alert.status === 'RESOLVED') return alert;
    return db.sosAlert.update({ where: { id }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
  }
}

export const sosService = new SosService();
