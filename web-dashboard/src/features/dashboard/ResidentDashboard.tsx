import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Home, Receipt, Megaphone, MessageSquareWarning, UserPlus, Siren } from 'lucide-react';
import { getOne, getList } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { Badge, statusTone } from '@/components/ui/Badge';
import { useSession } from '@/features/auth/session';
import type { Complaint, Invoice, Notice } from '@/lib/types';

interface MyResidency {
  id: string;
  role: string;
  isPrimary: boolean;
  unit: { id: string; unitNumber: string; occupancyStatus: string; block: { name: string } | null };
}

const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function ResidentDashboard() {
  const user = useSession((s) => s.user);
  const navigate = useNavigate();

  const units = useQuery({ queryKey: ['my-units'], queryFn: () => getOne<MyResidency[]>('/properties/residencies/mine') });
  const invoices = useQuery({ queryKey: ['my-invoices'], queryFn: () => getOne<Invoice[]>('/billing/invoices/mine') });
  const notices = useQuery({ queryKey: ['notices', 'feed'], queryFn: () => getList<Notice>('/notices', { activeOnly: 'true', pageSize: 3 }) });
  const complaints = useQuery({ queryKey: ['complaints', 'mine'], queryFn: () => getList<Complaint>('/complaints', { pageSize: 3 }) });

  if (units.isLoading || invoices.isLoading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  const myInvoices = invoices.data ?? [];
  const unpaid = myInvoices.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED');
  const outstanding = unpaid.reduce((sum, i) => sum + (Number(i.totalAmount) - Number(i.amountPaid)), 0);
  const firstName = user?.fullName.split(' ')[0] ?? 'there';

  return (
    <div>
      <PageHeader title={`Hi, ${firstName} 👋`} subtitle="Your home at a glance" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* My unit(s) */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2 text-slate-700"><Home className="h-5 w-5 text-brand-600" /><h2 className="font-semibold">My Home</h2></div>
          {(units.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">No unit assigned to you yet. Ask your admin to link your unit.</p>
          ) : (
            (units.data ?? []).map((r) => (
              <div key={r.id} className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="font-medium text-slate-800">{r.unit.block?.name ? `${r.unit.block.name} · ` : ''}{r.unit.unitNumber}</p>
                  <p className="text-xs text-slate-500">{r.role}{r.isPrimary ? ' · primary' : ''}</p>
                </div>
                <Badge tone={statusTone(r.unit.occupancyStatus)}>{r.unit.occupancyStatus.replace(/_/g, ' ')}</Badge>
              </div>
            ))
          )}
        </div>

        {/* My dues */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2 text-slate-700"><Receipt className="h-5 w-5 text-brand-600" /><h2 className="font-semibold">My Dues</h2></div>
          {outstanding <= 0 ? (
            <p className="text-sm text-emerald-700">You're all settled 🎉</p>
          ) : (
            <>
              <p className="text-2xl font-semibold text-red-600">{money(outstanding)}</p>
              <p className="mb-3 text-xs text-slate-500">outstanding across {unpaid.length} invoice{unpaid.length === 1 ? '' : 's'}</p>
              {unpaid.slice(0, 3).map((i) => (
                <div key={i.id} className="flex items-center justify-between border-t border-slate-100 py-2 text-sm">
                  <span className="text-slate-600">{i.invoiceNumber} · due {i.dueDate.slice(0, 10)}</span>
                  <Badge tone={statusTone(i.status)}>{i.status.replace(/_/g, ' ')}</Badge>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <QuickAction icon={UserPlus} label="New visitor" onClick={() => navigate('/gate')} />
        <QuickAction icon={MessageSquareWarning} label="Raise issue" onClick={() => navigate('/complaints')} />
        <QuickAction icon={Siren} label="Emergency" tone="text-red-600" onClick={() => navigate('/sos')} />
      </div>

      {/* Notices + complaints */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2 text-slate-700"><Megaphone className="h-5 w-5 text-brand-600" /><h2 className="font-semibold">Latest Notices</h2></div>
          {(notices.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">No notices</p>
          ) : (
            notices.data?.items.map((n) => (
              <div key={n.id} className="border-t border-slate-100 py-2 first:border-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">{n.isPinned ? '📌 ' : ''}{n.title}</p>
                  <Badge tone={statusTone(n.priority)}>{n.priority}</Badge>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2 text-slate-700"><MessageSquareWarning className="h-5 w-5 text-brand-600" /><h2 className="font-semibold">My Complaints</h2></div>
          {(complaints.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">No tickets raised</p>
          ) : (
            complaints.data?.items.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-t border-slate-100 py-2 text-sm first:border-0">
                <span className="text-slate-700">{c.ticketNumber} · {c.title}</span>
                <Badge tone={statusTone(c.status)}>{c.status.replace(/_/g, ' ')}</Badge>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, tone }: { icon: typeof Home; label: string; onClick: () => void; tone?: string }) {
  return (
    <button onClick={onClick} className="card flex flex-col items-center gap-2 p-4 hover:bg-slate-50">
      <Icon className={`h-6 w-6 ${tone ?? 'text-brand-600'}`} />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </button>
  );
}
