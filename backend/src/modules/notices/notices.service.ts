import type { NoticeAudience, NoticePriority, Prisma } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';

interface CreateInput {
  title: string;
  body: string;
  priority: NoticePriority;
  audience: NoticeAudience;
  category?: string | null;
  attachments: string[];
  publishedAt?: Date;
  expiresAt?: Date | null;
  isPinned: boolean;
}

interface Actor {
  userId: string;
  isManager: boolean;
}

interface ListParams {
  page?: number;
  pageSize?: number;
  priority?: NoticePriority;
  category?: string;
  activeOnly?: boolean;
}

class NoticeService {
  async list(db: TenantClient, params: ListParams, actor: Actor) {
    const page = resolvePagination(params);
    const now = new Date();
    const and: Prisma.NoticeWhereInput[] = [];

    if (params.priority) and.push({ priority: params.priority });
    if (params.category) and.push({ category: params.category });
    if (params.activeOnly) {
      and.push({ publishedAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] });
    }

    // Residents only see notices targeted at them (ALL, or their residency role).
    // Managers see everything regardless of audience.
    if (!actor.isManager) {
      and.push({ OR: await this.audienceOr(db, actor.userId) });
    }

    const where: Prisma.NoticeWhereInput = and.length ? { AND: and } : {};

    const [items, total] = await Promise.all([
      db.notice.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        skip: page.skip,
        take: page.take,
        include: {
          postedBy: { select: { id: true, fullName: true } },
          _count: { select: { reads: true } },
          // Whether the caller has read this notice.
          reads: { where: { userId: actor.userId }, select: { id: true }, take: 1 },
        },
      }),
      db.notice.count({ where }),
    ]);

    const mapped = items.map(({ reads, ...n }) => ({ ...n, readByMe: reads.length > 0 }));
    return { items: mapped, meta: buildMeta(page, total) };
  }

  async getById(db: TenantClient, id: string) {
    const notice = await db.notice.findFirst({
      where: { id },
      include: { postedBy: { select: { id: true, fullName: true } }, _count: { select: { reads: true } } },
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
        audience: input.audience,
        category: input.category ?? null,
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

  /** Mark a single notice read by the caller (idempotent). */
  async markRead(db: TenantClient, societyId: string, noticeId: string, userId: string): Promise<void> {
    await this.getById(db, noticeId); // 404 if not in this society
    await db.noticeRead.upsert({
      where: { noticeId_userId: { noticeId, userId } },
      create: { societyId, noticeId, userId },
      update: {},
    });
  }

  /** Audience clause for a resident — the notices targeted at their role(s). */
  private async audienceOr(db: TenantClient, userId: string): Promise<Prisma.NoticeWhereInput[]> {
    const residencies = await db.residency.findMany({
      where: { userId, movedOutAt: null },
      select: { role: true },
    });
    const roles = new Set(residencies.map((r) => r.role));
    const or: Prisma.NoticeWhereInput[] = [{ audience: 'ALL' }];
    if (roles.has('OWNER')) or.push({ audience: 'OWNERS' });
    if (roles.has('TENANT')) or.push({ audience: 'TENANTS' });
    return or;
  }

  /** Mark every currently-active notice the caller can see read (the feed view). */
  async markAllRead(db: TenantClient, societyId: string, actor: Actor): Promise<{ marked: number }> {
    const now = new Date();
    const active = await db.notice.findMany({
      where: {
        publishedAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(actor.isManager ? {} : { AND: [{ OR: await this.audienceOr(db, actor.userId) }] }),
      },
      select: { id: true },
    });
    if (active.length === 0) return { marked: 0 };
    const res = await db.noticeRead.createMany({
      data: active.map((n) => ({ societyId, noticeId: n.id, userId: actor.userId })),
      skipDuplicates: true,
    });
    return { marked: res.count };
  }

  /** Who has read a notice — names + timestamps (for the committee). */
  async readers(db: TenantClient, noticeId: string) {
    await this.getById(db, noticeId);
    const reads = await db.noticeRead.findMany({
      where: { noticeId },
      orderBy: { readAt: 'desc' },
      select: { userId: true, readAt: true },
    });
    if (reads.length === 0) return [];
    const users = await db.user.findMany({
      where: { id: { in: reads.map((r) => r.userId) } },
      select: { id: true, fullName: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));
    return reads.map((r) => ({ userId: r.userId, fullName: nameById.get(r.userId) ?? 'Unknown', readAt: r.readAt }));
  }
}

export const noticeService = new NoticeService();
