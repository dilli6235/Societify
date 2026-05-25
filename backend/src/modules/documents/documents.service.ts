import type { DocumentVisibility, Prisma, SystemRole } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { ForbiddenError, NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';

/** Which document visibilities a role is allowed to see. */
function allowedVisibilities(roles: SystemRole[]): DocumentVisibility[] {
  if (roles.includes('SOCIETY_ADMIN')) return ['ALL_RESIDENTS', 'COMMITTEE', 'ADMIN_ONLY'];
  if (roles.some((r) => r === 'COMMITTEE_MEMBER' || r === 'FACILITY_ADMIN')) return ['ALL_RESIDENTS', 'COMMITTEE'];
  return ['ALL_RESIDENTS'];
}

interface Actor {
  userId: string;
  roles: SystemRole[];
}

class DocumentService {
  async list(db: TenantClient, actor: Actor, params: { page?: number; pageSize?: number; category?: string }) {
    const page = resolvePagination(params);
    const where: Prisma.DocumentWhereInput = {
      visibility: { in: allowedVisibilities(actor.roles) },
      ...(params.category ? { category: params.category } : {}),
    };
    const [items, total] = await Promise.all([
      db.document.findMany({ where, orderBy: { createdAt: 'desc' }, skip: page.skip, take: page.take }),
      db.document.count({ where }),
    ]);
    return { items, meta: buildMeta(page, total) };
  }

  async getById(db: TenantClient, actor: Actor, id: string) {
    const doc = await db.document.findFirst({ where: { id } });
    if (!doc) throw new NotFoundError('Document not found');
    if (!allowedVisibilities(actor.roles).includes(doc.visibility)) {
      throw new ForbiddenError('You do not have access to this document');
    }
    return doc;
  }

  async create(db: TenantClient, societyId: string, uploadedById: string, data: {
    title: string; category: string; description?: string; fileUrl: string; visibility: DocumentVisibility;
  }) {
    return db.document.create({ data: { ...data, societyId, uploadedById } });
  }

  async update(db: TenantClient, id: string, data: Prisma.DocumentUpdateInput) {
    const doc = await db.document.findFirst({ where: { id }, select: { id: true } });
    if (!doc) throw new NotFoundError('Document not found');
    return db.document.update({ where: { id }, data });
  }

  async remove(db: TenantClient, id: string) {
    const doc = await db.document.findFirst({ where: { id }, select: { id: true } });
    if (!doc) throw new NotFoundError('Document not found');
    await db.document.delete({ where: { id } });
  }
}

export const documentService = new DocumentService();
