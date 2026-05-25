import type { NoticePriority, Prisma } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';

interface CreateInput {
  title: string;
  body: string;
  priority: NoticePriority;
  attachments: string[];
  publishedAt?: Date;
  expiresAt?: Date | null;
  isPinned: boolean;
}

class NoticeService {
  async list(db: TenantClient, params: {
    page?: number; pageSize?: number; priority?: NoticePriority; activeOnly?: boolean;
  }) {
    const page = resolvePagination(params);
    const now = new Date();
    const where: Prisma.NoticeWhereInput = {
      ...(params.priority ? { priority: params.priority } : {}),
      ...(params.activeOnly
        ? {
            publishedAt: { lte: now },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.notice.findMany({
        where,
        // Pinned first, then newest.
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        skip: page.skip,
        take: page.take,
        include: { postedBy: { select: { id: true, fullName: true } } },
      }),
      db.notice.count({ where }),
    ]);
    return { items, meta: buildMeta(page, total) };
  }

  async getById(db: TenantClient, id: string) {
    const notice = await db.notice.findFirst({
      where: { id },
      include: { postedBy: { select: { id: true, fullName: true } } },
    });
    if (!notice) throw new NotFoundError('Notice not found');
    return notice;
  }

  async create(db: TenantClient, societyId: string, postedById: string, input: CreateInput) {
    return db.notice.create({
      data: {
        societyId,
        title: input.title,
        body: input.body,
        priority: input.priority,
        attachments: input.attachments,
        publishedAt: input.publishedAt ?? new Date(),
        expiresAt: input.expiresAt ?? null,
        isPinned: input.isPinned,
        postedById,
      },
    });
  }

  async update(db: TenantClient, id: string, data: Prisma.NoticeUpdateInput) {
    await this.getById(db, id);
    return db.notice.update({ where: { id }, data });
  }

  async remove(db: TenantClient, id: string) {
    await this.getById(db, id);
    await db.notice.delete({ where: { id } });
  }
}

export const noticeService = new NoticeService();
