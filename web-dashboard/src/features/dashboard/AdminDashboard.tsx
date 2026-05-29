import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Bell } from 'lucide-react';
import { getOne, post } from '@/lib/apiClient';
import { useApiMutation } from '@/lib/hooks';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Panel } from '@/components/ui/Panel';
import { Badge, statusTone } from '@/components/ui/Badge';
import { inr, short, ChartTooltip, ChartLegend } from '@/components/ui/charts';
import type { DashboardSummary } from '@/lib/types';

const SERIES = [
  { key: 'collected', label: 'Collected', color: '#3fcf8e' },
  { key: 'pending', label: 'Pending', color: '#e8b04b' },
  { key: 'expenses', label: 'Expenses', color: '#5aa9f0' },
] as const;

/** Society-wide KPI + finance dashboard for admins / committee. */
export function AdminDashboard() {
  const summary = useQuery({ queryKey: ['dashboard', 'summary'], queryFn: () => getOne<DashboardSummary>('/dashboard/summary') });

  const generate = useApiMutation((_v: void) => post('/billing/invoices/generate'), {
    invalidate: [['dashboard'], ['invoices']],
    successMessage: "This month's bills generated",
  });
  const remind = useApiMutation((_v: void) => post('/billing/invoices/remind'), {
    successMessage: 'Reminders sent to unpaid flats',
  });

  if (summary.isLoading || !summary.data) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  const { kpis, series, pendingFlats, society } = summary.data;

  return (
    <div>
      <PageHeader
        title={`Dashboard`}
        subtitle={society.name}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" loading={remind.isPending} onClick={() => remind.mutate()}>
              <Bell className="h-4 w-4" /> Remind unpaid
            </Button>
            <Button size="sm" loading={generate.isPending} onClick={() => generate.mutate()}>
              <Plus className="h-4 w-4" /> Generate this month's bills
            </Button>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Collected this month"
          value={short(kpis.collectedThisMonth)}
          trend="up"
          foot={<><b>{kpis.collectionRate}%</b> collection rate</>}
        />
        <StatCard
          label="Outstanding dues"
          value={short(kpis.pendingThisMonth)}
          trend="down"
          foot={<><b>{kpis.billedUnits - kpis.paidUnits} flats</b> pending</>}
        />
        <StatCard
          label="Paid units"
          value={kpis.paidUnits}
          sub={`/ ${kpis.billedUnits}`}
          foot={`${kpis.units} units total`}
        />
        <StatCard
          label="Expenses this month"
          value={short(kpis.expensesThisMonth)}
          foot={`${kpis.voucherCount} vouchers`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Collection vs expenses chart */}
        <Panel
          className="lg:col-span-3"
          title="Collection vs expenses"
          subtitle="Recent months"
          aside={<ChartLegend items={SERIES.map((s) => ({ label: s.label, color: s.color }))} />}
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#8ba096', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => `₹${v / 1000}k`}
                  tick={{ fill: '#5f7268', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip />} />
                {SERIES.map((s) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={16} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Pending flats */}
        <Panel
          className="lg:col-span-2"
          title="Pending flats"
          aside={<Badge tone="red">{pendingFlats.length} unpaid</Badge>}
        >
          {pendingFlats.length === 0 ? (
            <p className="py-8 text-center text-sm text-faint">All flats paid 🎉</p>
          ) : (
            <div className="-my-1 max-h-[260px] overflow-y-auto">
              {pendingFlats.map((f) => (
                <div key={f.id} className="flex items-center justify-between border-b border-line py-2.5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface2 text-xs font-semibold text-muted">
                      {(f.resident ?? f.unitNumber).split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {f.blockName ? `${f.blockName} · ` : ''}{f.unitNumber}
                      </p>
                      <p className="text-xs text-faint">{f.resident ?? '—'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-ink">{inr(f.outstanding)}</p>
                    <Badge tone={statusTone(f.status)}>{f.status.replace(/_/g, ' ')}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
