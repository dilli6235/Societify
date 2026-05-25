import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Receipt, MessageSquareWarning, type LucideIcon } from 'lucide-react';
import { getList, getOne } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import type { Complaint, Invoice } from '@/lib/types';

interface SocietyProfile {
  name: string;
  _count: { units: number; blocks: number; users: number };
}

function StatCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number | string; tone: string }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

/** Society-wide KPI dashboard for admins / committee. */
export function AdminDashboard() {
  const society = useQuery({ queryKey: ['society'], queryFn: () => getOne<SocietyProfile>('/properties/society') });
  const overdue = useQuery({
    queryKey: ['invoices', 'overdue'],
    queryFn: () => getList<Invoice>('/billing/invoices', { status: 'OVERDUE', pageSize: 1 }),
  });
  const openComplaints = useQuery({
    queryKey: ['complaints', 'open'],
    queryFn: () => getList<Complaint>('/complaints', { status: 'OPEN', pageSize: 1 }),
  });

  if (society.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const c = society.data?._count;

  return (
    <div>
      <PageHeader title={`Welcome — ${society.data?.name ?? ''}`} subtitle="Community at a glance" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Units" value={c?.units ?? 0} tone="bg-brand-50 text-brand-600" />
        <StatCard icon={Users} label="People" value={c?.users ?? 0} tone="bg-purple-50 text-purple-600" />
        <StatCard icon={Receipt} label="Overdue invoices" value={overdue.data?.meta?.total ?? 0} tone="bg-red-50 text-red-600" />
        <StatCard icon={MessageSquareWarning} label="Open complaints" value={openComplaints.data?.meta?.total ?? 0} tone="bg-amber-50 text-amber-600" />
      </div>

      <div className="mt-6 card p-6">
        <h2 className="mb-2 text-lg font-semibold text-slate-800">Getting started</h2>
        <p className="text-sm text-slate-500">
          Use the sidebar to manage properties, invite residents, raise invoices, run the gate, and engage your
          community.
        </p>
      </div>
    </div>
  );
}
