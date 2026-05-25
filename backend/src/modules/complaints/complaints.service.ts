import type { ComplaintPriority, ComplaintStatus, Prisma, SystemRole } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { withSociety } from '@/core/tenant/rls';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';
import { enqueueNotification } from '@/jobs/notificationQueue';

interface Actor {
  userId: string;
  roles: SystemRole[];
}

function isStaff(roles: SystemRole[]): boolean {
  return roles.some((r) => r === 'SOCIETY_ADMIN' || r === 'COMMITTEE_MEMBER' || r === 'FACILITY_ADMIN');
}

// Allowed status transitions for the ticket lifecycle.
const TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED', 'OPEN'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  REOPENED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  CLOSED: ['REOPENED'],
};

class ComplaintService {
  async create(
    societyId: string,
    raisedById: string,
    input: { title: string; description: string; category: string; priority: ComplaintPriority; attachments: string[] },
  ) {
    return withSociety(societyId, async (tx) => {
      const { complaintSeq } = await tx.society.update({
        where: { id: societyId },
        data: { complaintSeq: { increment: 1 } },
        select: { complaintSeq: true },
      });
      return tx.complaint.create({
        data: {
          societyId,
          ticketNumber: `TKT-${String(complaintSeq).padStart(6, '0')}`,
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          status: 'OPEN',
          attachments: input.attachments,
          raisedById,
        },
      });
    });
  }

  async list(db: TenantClient, actor: Actor, params: {
    page?: number; pageSize?: number; status?: ComplaintStatus; priority?: ComplaintPriority;
    category?: string; assignedToId?: string; mine?: boolean;
  }) {
    const page = resolvePagination(params);
    const where: Prisma.ComplaintWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.assignedToId ? { assignedToId: params.assignedToId } : {}),
      // Residents see only their own tickets, regardless of `mine`.
      ...(!isStaff(actor.roles) ? { raisedById: actor.userId } : params.mine ? { raisedById: actor.userId } : {}),
    };
    const [items, total] = await Promise.all([
      db.complaint.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: page.skip,
        take: page.take,
        include: {
          raisedBy: { select: { id: true, fullName: true } },
          assignedTo: { select: { id: true, fullName: true } },
          _count: { select: { comments: true } },
        },
      }),
      db.complaint.count({ where }),
    ]);
    return { items, meta: buildMeta(page, total) };
  }

  async getById(db: TenantClient, actor: Actor, id: string) {
    const complaint = await db.complaint.findFirst({
      where: { id },
      include: {
        raisedBy: { select: { id: true, fullName: true } },
        assignedTo: { select: { id: true, fullName: true } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!complaint) throw new NotFoundError('Complaint not found');

    const staff = isStaff(actor.roles);
    if (!staff && complaint.raisedById !== actor.userId) {
      throw new ForbiddenError('You can only view your own complaints');
    }
    // Hide internal comments from non-staff.
    if (!staff) complaint.comments = complaint.comments.filter((c) => !c.isInternal);
    return complaint;
  }

  /** Assign (or unassign) a ticket to a staff member. Staff-only (route-gated). */
  async assign(db: TenantClient, id: string, assigneeId: string | null) {
    const complaint = await db.complaint.findFirst({
      where: { id },
      select: { id: true, status: true, societyId: true, ticketNumber: true, title: true },
    });
    if (!complaint) throw new NotFoundError('Complaint not found');

    if (assigneeId) {
      const assignee = await db.user.findFirst({ where: { id: assigneeId }, select: { id: true } });
      if (!assignee) throw new BadRequestError('assigneeId does not reference a user in this society');
    }

    const advance = assigneeId && (complaint.status === 'OPEN' || complaint.status === 'REOPENED');
    const updated = await db.complaint.update({
      where: { id },
      data: { assignedToId: assigneeId, ...(advance ? { status: 'IN_PROGRESS' } : {}) },
      include: { assignedTo: { select: { id: true, fullName: true } } },
    });

    if (assigneeId) {
      await enqueueNotification({
        societyId: complaint.societyId,
        event: 'COMPLAINT_ASSIGNED',
        recipientUserIds: [assigneeId],
        data: { ticketNumber: complaint.ticketNumber, title: complaint.title },
      });
    }
    return updated;
  }

  /** Transition status, optionally attaching a staff comment, atomically. */
  async updateStatus(societyId: string, actorId: string, id: string, next: ComplaintStatus, comment?: string) {
    const { result, raisedById, ticketNumber } = await withSociety(societyId, async (tx) => {
      const complaint = await tx.complaint.findFirst({
        where: { id, societyId },
        select: { id: true, status: true, raisedById: true, ticketNumber: true },
      });
      if (!complaint) throw new NotFoundError('Complaint not found');

      if (complaint.status !== next && !TRANSITIONS[complaint.status].includes(next)) {
        throw new ConflictError(`Cannot move ticket from ${complaint.status} to ${next}`);
      }

      if (comment) {
        await tx.complaintComment.create({
          data: { societyId, complaintId: id, authorId: actorId, body: comment, isInternal: false },
        });
      }

      const updated = await tx.complaint.update({
        where: { id },
        data: {
          status: next,
          resolvedAt: next === 'RESOLVED' ? new Date() : next === 'REOPENED' ? null : undefined,
        },
      });
      return { result: updated, raisedById: complaint.raisedById, ticketNumber: complaint.ticketNumber };
    });

    // Notify the raiser (unless they made the change themselves) — after commit.
    if (raisedById !== actorId) {
      await enqueueNotification({
        societyId,
        event: 'COMPLAINT_STATUS_CHANGED',
        recipientUserIds: [raisedById],
        data: { ticketNumber, status: next },
      });
    }
    return result;
  }

  async addComment(db: TenantClient, actor: Actor, id: string, body: string, isInternal: boolean) {
    // Ensure the actor may see this complaint (also 404s cross-tenant).
    const complaint = await this.getById(db, actor, id);
    if (isInternal && !isStaff(actor.roles)) {
      throw new ForbiddenError('Only staff can post internal comments');
    }
    return db.complaintComment.create({
      data: { societyId: complaint.societyId, complaintId: id, authorId: actor.userId, body, isInternal },
    });
  }
}

export const complaintService = new ComplaintService();
