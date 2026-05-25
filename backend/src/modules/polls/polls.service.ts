import type { Prisma } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { withSociety } from '@/core/tenant/rls';
import { BadRequestError, ConflictError, NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';

interface CreateInput {
  question: string;
  description?: string;
  isMultiple: boolean;
  closesAt?: Date | null;
  options: string[];
}

class PollService {
  async create(societyId: string, createdById: string, input: CreateInput) {
    // Poll + its options are created in one tx with societyId set on each
    // (nested creates aren't auto-scoped by the tenant extension).
    return withSociety(societyId, (tx) =>
      tx.poll.create({
        data: {
          societyId,
          createdById,
          question: input.question,
          description: input.description,
          isMultiple: input.isMultiple,
          closesAt: input.closesAt ?? null,
          options: { create: input.options.map((text) => ({ societyId, text })) },
        },
        include: { options: true },
      }),
    );
  }

  async list(db: TenantClient, params: { page?: number; pageSize?: number; openOnly?: boolean }) {
    const page = resolvePagination(params);
    const now = new Date();
    const where: Prisma.PollWhereInput = params.openOnly
      ? { isClosed: false, OR: [{ closesAt: null }, { closesAt: { gt: now } }] }
      : {};
    const [items, total] = await Promise.all([
      db.poll.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
        include: { options: { select: { id: true, text: true } }, _count: { select: { votes: true } } },
      }),
      db.poll.count({ where }),
    ]);
    return { items, meta: buildMeta(page, total) };
  }

  /** Full poll with per-option tallies and the caller's own selections. */
  async getById(db: TenantClient, userId: string, id: string) {
    const poll = await db.poll.findFirst({ where: { id }, include: { options: true } });
    if (!poll) throw new NotFoundError('Poll not found');

    const [tally, myVotes] = await Promise.all([
      db.pollVote.groupBy({ by: ['pollOptionId'], where: { pollId: id }, _count: { _all: true } }),
      db.pollVote.findMany({ where: { pollId: id, userId }, select: { pollOptionId: true } }),
    ]);

    const counts = new Map(tally.map((t) => [t.pollOptionId, t._count._all]));
    const totalVotes = tally.reduce((s, t) => s + t._count._all, 0);
    const myOptionIds = myVotes.map((v) => v.pollOptionId);

    return {
      ...poll,
      options: poll.options.map((o) => ({ id: o.id, text: o.text, votes: counts.get(o.id) ?? 0 })),
      totalVotes,
      hasVoted: myOptionIds.length > 0,
      myOptionIds,
    };
  }

  /** Cast a vote. One submission per user per poll; single/multiple enforced. */
  async vote(societyId: string, userId: string, pollId: string, optionIds: string[]) {
    return withSociety(societyId, async (tx) => {
      const poll = await tx.poll.findFirst({
        where: { id: pollId, societyId },
        include: { options: { select: { id: true } } },
      });
      if (!poll) throw new NotFoundError('Poll not found');
      if (poll.isClosed || (poll.closesAt && poll.closesAt < new Date())) {
        throw new ConflictError('This poll is closed');
      }

      const unique = [...new Set(optionIds)];
      if (!poll.isMultiple && unique.length > 1) {
        throw new BadRequestError('This poll allows only one selection');
      }
      const validIds = new Set(poll.options.map((o) => o.id));
      if (!unique.every((oid) => validIds.has(oid))) {
        throw new BadRequestError('One or more options do not belong to this poll');
      }

      const already = await tx.pollVote.findFirst({ where: { pollId, userId }, select: { id: true } });
      if (already) throw new ConflictError('You have already voted in this poll');

      await tx.pollVote.createMany({
        data: unique.map((pollOptionId) => ({ societyId, pollId, pollOptionId, userId })),
      });
      return { voted: true, optionIds: unique };
    });
  }

  async close(db: TenantClient, id: string) {
    const poll = await db.poll.findFirst({ where: { id }, select: { id: true } });
    if (!poll) throw new NotFoundError('Poll not found');
    return db.poll.update({ where: { id }, data: { isClosed: true } });
  }
}

export const pollService = new PollService();
