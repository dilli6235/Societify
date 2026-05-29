import type { TenantClient } from '@/core/tenant/tenantPrisma';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

/** The last 6 month windows (UTC), oldest → current. */
function lastSixMonths(now: Date): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    buckets.push({ key: `${start.getUTCFullYear()}-${start.getUTCMonth()}`, label: MONTH_LABELS[start.getUTCMonth()], start, end });
  }
  return buckets;
}

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
const num = (v: unknown) => Number(v ?? 0);

class DashboardService {
  /**
   * Society-wide financial + operational summary for the admin dashboard:
   * headline KPIs, a 6-month collected/pending/expense series for the charts,
   * the current month's pending flats, and this month's expense split.
   */
  async adminSummary(db: TenantClient, societyId: string) {
    const now = new Date();
    const buckets = lastSixMonths(now);
    const current = buckets[buckets.length - 1];
    const rangeStart = buckets[0].start;

    const [society, unitCount, peopleCount, openComplaints, invoices6mo, expenses6mo, pending] = await Promise.all([
      db.society.findUnique({
        where: { id: societyId },
        select: {
          name: true,
          maintenanceMethod: true,
          maintenanceFixedAmount: true,
          maintenanceRatePerSqft: true,
        },
      }),
      db.unit.count(),
      db.user.count(),
      db.complaint.count({ where: { status: 'OPEN' } }),
      db.maintenanceInvoice.findMany({
        where: { billingPeriodStart: { gte: rangeStart }, status: { not: 'CANCELLED' } },
        select: { billingPeriodStart: true, totalAmount: true, amountPaid: true, status: true, dueDate: true },
      }),
      db.expense.findMany({
        where: { expenseDate: { gte: rangeStart } },
        select: { expenseDate: true, amount: true, category: true },
      }),
      db.maintenanceInvoice.findMany({
        where: { billingPeriodStart: { gte: current.start }, status: { notIn: ['PAID', 'CANCELLED'] } },
        orderBy: { totalAmount: 'desc' },
        take: 12,
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          amountPaid: true,
          status: true,
          dueDate: true,
          unit: {
            select: {
              unitNumber: true,
              block: { select: { name: true } },
              residencies: {
                where: { isPrimary: true, movedOutAt: null },
                take: 1,
                select: { user: { select: { fullName: true } } },
              },
            },
          },
        },
      }),
    ]);

    // ── 6-month series (collected / pending / expenses) ──────────────────
    const series = buckets.map((b) => ({ label: b.label, collected: 0, pending: 0, expenses: 0 }));
    const indexByKey = new Map(buckets.map((b, i) => [b.key, i]));

    for (const inv of invoices6mo) {
      const i = indexByKey.get(monthKey(inv.billingPeriodStart));
      if (i === undefined) continue;
      const total = num(inv.totalAmount);
      const paid = num(inv.amountPaid);
      series[i].collected += paid;
      series[i].pending += total - paid;
    }
    for (const exp of expenses6mo) {
      const i = indexByKey.get(monthKey(exp.expenseDate));
      if (i === undefined) continue;
      series[i].expenses += num(exp.amount);
    }

    // ── Current-month KPIs ───────────────────────────────────────────────
    const monthInvoices = invoices6mo.filter((inv) => monthKey(inv.billingPeriodStart) === current.key);
    const billedThisMonth = monthInvoices.reduce((s, i) => s + num(i.totalAmount), 0);
    const collectedThisMonth = monthInvoices.reduce((s, i) => s + num(i.amountPaid), 0);
    const paidUnits = monthInvoices.filter((i) => i.status === 'PAID').length;

    const monthExpenses = expenses6mo.filter((e) => monthKey(e.expenseDate) === current.key);
    const expensesThisMonth = monthExpenses.reduce((s, e) => s + num(e.amount), 0);

    // Overdue = explicitly OVERDUE, or past due and not fully paid.
    const overdueInvoices = invoices6mo.filter(
      (i) => i.status === 'OVERDUE' || (i.dueDate < now && i.status !== 'PAID'),
    );
    const overdueAmount = overdueInvoices.reduce((s, i) => s + (num(i.totalAmount) - num(i.amountPaid)), 0);

    // ── Expense split by category (this month) ───────────────────────────
    const catMap = new Map<string, number>();
    for (const e of monthExpenses) catMap.set(e.category, (catMap.get(e.category) ?? 0) + num(e.amount));
    const expenseByCategory = [...catMap.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    // ── Pending flats ────────────────────────────────────────────────────
    const pendingFlats = pending.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      unitNumber: i.unit?.unitNumber ?? '—',
      blockName: i.unit?.block?.name ?? null,
      resident: i.unit?.residencies?.[0]?.user?.fullName ?? null,
      outstanding: num(i.totalAmount) - num(i.amountPaid),
      status: i.status,
      dueDate: i.dueDate,
    }));

    const perUnit =
      society?.maintenanceMethod === 'PER_SQFT'
        ? { method: 'PER_SQFT' as const, ratePerSqft: num(society?.maintenanceRatePerSqft) }
        : { method: 'FIXED' as const, fixedAmount: num(society?.maintenanceFixedAmount) };

    return {
      society: { name: society?.name ?? '' },
      kpis: {
        units: unitCount,
        people: peopleCount,
        openComplaints,
        billedThisMonth,
        collectedThisMonth,
        pendingThisMonth: billedThisMonth - collectedThisMonth,
        expensesThisMonth,
        netBalance: collectedThisMonth - expensesThisMonth,
        paidUnits,
        billedUnits: monthInvoices.length,
        collectionRate: billedThisMonth > 0 ? Math.round((collectedThisMonth / billedThisMonth) * 100) : 0,
        overdueCount: overdueInvoices.length,
        overdueAmount,
        voucherCount: monthExpenses.length,
      },
      perUnit,
      series,
      expenseByCategory,
      pendingFlats,
    };
  }
}

export const dashboardService = new DashboardService();
