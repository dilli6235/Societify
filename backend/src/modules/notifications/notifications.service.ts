import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';

/**
 * User-facing notification feed + device-token registration. Every query is
 * scoped to the calling user (`userId`) on top of tenant RLS — a user only
 * ever sees their own notifications.
 */
class NotificationService {
  async list(db: TenantClient, userId: string, params: { page?: number; pageSize?: number; unreadOnly?: boolean }) {
    const page = resolvePagination(params);
    const where = { userId, ...(params.unreadOnly ? { readAt: null } : {}) };
    const [items, total, unread] = await Promise.all([
      db.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: page.skip, take: page.take }),
      db.notification.count({ where }),
      db.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, meta: { ...buildMeta(page, total), unread } };
  }

  async markRead(db: TenantClient, userId: string, id: string) {
    const notif = await db.notification.findFirst({ where: { id, userId }, select: { id: true } });
    if (!notif) throw new NotFoundError('Notification not found');
    return db.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(db: TenantClient, userId: string) {
    const result = await db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async registerDevice(db: TenantClient, societyId: string, userId: string, token: string, platform: string) {
    // Tokens move between users (shared device, re-login) — re-point on conflict.
    return db.deviceToken.upsert({
      where: { token },
      create: { societyId, userId, token, platform },
      update: { userId, platform },
    });
  }

  async removeDevice(db: TenantClient, userId: string, token: string) {
    const result = await db.deviceToken.deleteMany({ where: { token, userId } });
    return { removed: result.count };
  }
}

export const notificationService = new NotificationService();
