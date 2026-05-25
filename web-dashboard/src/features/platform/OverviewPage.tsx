import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Home, Receipt, CheckCircle2, type LucideIcon } from 'lucide-react';
import { getOne } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';

interface Stats {
  societies: number;
  activeSocieties: number;
  users: number;
  units: number;
  invoices: number;
}

function Stat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: string }) {
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

export function PlatformOverviewPage() {
  const { data, isLoading } = useQuery({ queryKey: ['platform-stats'], queryFn: () => getOne<Stats>('/platform/stats') });

  if (isLoading || !data) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  return (
    <div>
      <PageHeader title="Platform overview" subtitle="Across all communities on Societify" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={Building2} label="Societies" value={data.societies} tone="bg-brand-50 text-brand-600" />
        <Stat icon={CheckCircle2} label="Active subscriptions" value={data.activeSocieties} tone="bg-emerald-50 text-emerald-600" />
        <Stat icon={Users} label="Total users" value={data.users} tone="bg-purple-50 text-purple-600" />
        <Stat icon={Home} label="Total units" value={data.units} tone="bg-amber-50 text-amber-600" />
        <Stat icon={Receipt} label="Invoices raised" value={data.invoices} tone="bg-rose-50 text-rose-600" />
      </div>
    </div>
  );
}
