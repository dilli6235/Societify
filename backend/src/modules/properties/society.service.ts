import type { Prisma } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { NotFoundError } from '@/core/errors/AppError';

/**
 * `Society` is the tenant ROOT and is intentionally not under RLS, so we scope
 * explicitly by the session's societyId (which comes only from the token). A
 * tenant can therefore only ever read/update its own society.
 */
class SocietyService {
  async getProfile(db: TenantClient, societyId: string) {
    const society = await db.society.findUnique({
      where: { id: societyId },
      include: {
        plan: { select: { id: true, name: true, maxUnits: true, features: true } },
        _count: { select: { units: true, blocks: true, users: true } },
      },
    });
    if (!society) throw new NotFoundError('Society not found');
    return society;
  }

  async updateProfile(
    db: TenantClient,
    societyId: string,
    data: Prisma.SocietyUpdateInput,
  ) {
    // Ensure the row exists for our tenant before updating.
    await this.getProfile(db, societyId);
    return db.society.update({ where: { id: societyId }, data });
  }
}

export const societyService = new SocietyService();
