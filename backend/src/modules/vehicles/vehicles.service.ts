import type { Prisma, VehicleType } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { BadRequestError, NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';

interface CreateInput {
  unitId: string;
  type: VehicleType;
  registrationNumber: string;
  make?: string;
  model?: string;
  color?: string;
  parkingSlot?: string;
  ownerName?: string;
}

class VehicleService {
  async list(db: TenantClient, params: {
    page?: number; pageSize?: number; unitId?: string; type?: VehicleType; search?: string;
  }) {
    const page = resolvePagination(params);
    const where: Prisma.VehicleWhereInput = {
      ...(params.unitId ? { unitId: params.unitId } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.search ? { registrationNumber: { contains: params.search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      db.vehicle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
        include: { unit: { select: { id: true, unitNumber: true } } },
      }),
      db.vehicle.count({ where }),
    ]);
    return { items, meta: buildMeta(page, total) };
  }

  async getById(db: TenantClient, id: string) {
    const v = await db.vehicle.findFirst({ where: { id }, include: { unit: { select: { id: true, unitNumber: true } } } });
    if (!v) throw new NotFoundError('Vehicle not found');
    return v;
  }

  async create(db: TenantClient, societyId: string, data: CreateInput) {
    const unit = await db.unit.findFirst({ where: { id: data.unitId }, select: { id: true } });
    if (!unit) throw new BadRequestError('unitId does not reference a unit in this society');
    return db.vehicle.create({ data: { ...data, societyId } });
  }

  async update(db: TenantClient, id: string, data: Prisma.VehicleUpdateInput) {
    await this.getById(db, id);
    return db.vehicle.update({ where: { id }, data });
  }

  async remove(db: TenantClient, id: string) {
    await this.getById(db, id);
    await db.vehicle.delete({ where: { id } });
  }
}

export const vehicleService = new VehicleService();
