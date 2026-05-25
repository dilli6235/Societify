import type { CheckDirection, Prisma, StaffRole } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { BadRequestError, NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';
import { generateOpaqueToken } from '@/utils/otp';

class StaffService {
  async list(db: TenantClient, params: { page?: number; pageSize?: number; role?: StaffRole; search?: string }) {
    const page = resolvePagination(params);
    const where: Prisma.StaffMemberWhereInput = {
      ...(params.role ? { role: params.role } : {}),
      ...(params.search ? { fullName: { contains: params.search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      db.staffMember.findMany({ where, orderBy: { fullName: 'asc' }, skip: page.skip, take: page.take }),
      db.staffMember.count({ where }),
    ]);
    return { items, meta: buildMeta(page, total) };
  }

  async getById(db: TenantClient, id: string) {
    const s = await db.staffMember.findFirst({
      where: { id },
      include: { attendance: { orderBy: { timestamp: 'desc' }, take: 10 } },
    });
    if (!s) throw new NotFoundError('Staff member not found');
    return s;
  }

  async create(db: TenantClient, societyId: string, data: {
    fullName: string; phone?: string; role: StaffRole; photoUrl?: string; idProofUrl?: string;
  }) {
    const code = `STF-${generateOpaqueToken(5).toUpperCase()}`;
    return db.staffMember.create({ data: { ...data, societyId, code } });
  }

  async update(db: TenantClient, id: string, data: Prisma.StaffMemberUpdateInput) {
    await this.getById(db, id);
    return db.staffMember.update({ where: { id }, data });
  }

  async remove(db: TenantClient, id: string) {
    await this.getById(db, id);
    await db.staffMember.delete({ where: { id } });
  }

  // ── Attendance ────────────────────────────────────────────────────────────

  async markAttendance(
    db: TenantClient,
    societyId: string,
    recordedById: string,
    input: { staffId?: string; code?: string; direction: CheckDirection; gateName?: string },
  ) {
    const staff = await db.staffMember.findFirst({
      where: input.staffId ? { id: input.staffId } : { code: input.code },
      select: { id: true, fullName: true, isActive: true },
    });
    if (!staff) throw new BadRequestError('No staff member matches that id/code in this society');
    if (!staff.isActive) throw new BadRequestError('Staff member is inactive');

    const log = await db.staffAttendance.create({
      data: { societyId, staffId: staff.id, direction: input.direction, gateName: input.gateName, recordedById },
    });
    return { ...log, staffName: staff.fullName };
  }

  async listAttendance(db: TenantClient, params: { page?: number; pageSize?: number; staffId?: string; from?: Date; to?: Date }) {
    const page = resolvePagination(params);
    const where: Prisma.StaffAttendanceWhereInput = {
      ...(params.staffId ? { staffId: params.staffId } : {}),
      ...(params.from || params.to
        ? { timestamp: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lte: params.to } : {}) } }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.staffAttendance.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: page.skip,
        take: page.take,
        include: { staff: { select: { id: true, fullName: true, role: true } } },
      }),
      db.staffAttendance.count({ where }),
    ]);
    return { items, meta: buildMeta(page, total) };
  }
}

export const staffService = new StaffService();
