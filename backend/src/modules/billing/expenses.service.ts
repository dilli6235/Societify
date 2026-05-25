import type { ExpenseCategory, Prisma } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';

interface ListParams {
  page?: number;
  pageSize?: number;
  category?: ExpenseCategory;
  from?: Date;
  to?: Date;
}

interface CreateInput {
  category: ExpenseCategory;
  title: string;
  description?: string;
  amount: number;
  vendorName?: string;
  expenseDate: Date;
  receiptUrl?: string;
}

function dateFilter(from?: Date, to?: Date): Prisma.ExpenseWhereInput {
  if (!from && !to) return {};
  return { expenseDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } };
}

class ExpenseService {
  async list(db: TenantClient, params: ListParams) {
    const page = resolvePagination(params);
    const where: Prisma.ExpenseWhereInput = {
      ...(params.category ? { category: params.category } : {}),
      ...dateFilter(params.from, params.to),
    };

    const [items, total] = await Promise.all([
      db.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      db.expense.count({ where }),
    ]);
    return { items, meta: buildMeta(page, total) };
  }

  async getById(db: TenantClient, id: string) {
    const expense = await db.expense.findFirst({ where: { id } });
    if (!expense) throw new NotFoundError('Expense not found');
    return expense;
  }

  async create(db: TenantClient, societyId: string, recordedById: string, data: CreateInput) {
    return db.expense.create({ data: { ...data, societyId, recordedById } });
  }

  async update(db: TenantClient, id: string, data: Prisma.ExpenseUpdateInput) {
    await this.getById(db, id);
    return db.expense.update({ where: { id }, data });
  }

  async remove(db: TenantClient, id: string) {
    await this.getById(db, id);
    await db.expense.delete({ where: { id } });
  }

  /** Totals grouped by category over an optional date range — for dashboards. */
  async summary(db: TenantClient, from?: Date, to?: Date) {
    const grouped = await db.expense.groupBy({
      by: ['category'],
      where: dateFilter(from, to),
      _sum: { amount: true },
      _count: { _all: true },
    });

    const byCategory = grouped.map((g) => ({
      category: g.category,
      total: Number(g._sum.amount ?? 0),
      count: g._count._all,
    }));
    const grandTotal = byCategory.reduce((s, c) => s + c.total, 0);

    return { byCategory, grandTotal };
  }
}

export const expenseService = new ExpenseService();
