import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Home, Megaphone, MessageSquareWarning, UserPlus, Siren, Download } from 'lucide-react';
import { getOne, getList, downloadFile } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { Panel } from '@/components/ui/Panel';
import { Hero } from '@/components/ui/Hero';
import { Button } from '@/components/ui/Button';
import { Badge, statusTone } from '@/components/ui/Badge';
import { PillButton } from '@/components/ui/PillButton';
import { toast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session';
import type { Complaint, Invoice, Notice } from '@/lib/types';

interface MyResidency {
  id: string;
  role: string;
  isPrimary: boolean;
  unit: { id: string; unitNumber: string; occupancyStatus: string; block: { name: string } | null };
}

const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const savePdf = (url: string, filename: string) =>
  downloadFile(url, filename).catch(() => toast.error('Could not download PDF'));

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
  const paidToDate = myInvoices
    .filter((i) => i.status === 'PAID')
    .reduce((s, i) => s + Number(i.totalAmount), 0);
  const firstName = user?.fullName.split(' ')[0] ?? 'there';

  return (
    <div>
      <PageHeader title={`Hi, ${firstName} 👋`} subtitle="Your home at a glance" />

      {/* Dues hero */}
      <Hero
        action={
          outstanding > 0 ? (
            <Button onClick={() => toast.success('Online payments arrive in the next update')}>Pay now</Button>
          ) : undefined
        }
      >
        <div className="text-xs text-muted">Current dues</div>
        <div className="font-display text-[30px] font-medium text-ink">{money(outstanding)}</div>
        <div className="mt-1 text-xs">
          {outstanding > 0 ? (
            <span className="text-danger">{unpaid.length} bill{unpaid.length === 1 ? '' : 's'} pending</span>
          ) : (
            <span className="text-green">All settled — thank you 🎉</span>
          )}
        </div>
      </Hero>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* My unit(s) */}
        <Panel title="My Home" aside={<Home className="h-5 w-5 text-green" />}>
          {(units.data ?? []).length === 0 ? (
            <p className="text-sm text-faint">No unit assigned to you yet. Ask your admin to link your unit.</p>
          ) : (
            (units.data ?? []).map((r) => (
              <div key={r.id} className="mb-2 flex items-center justify-between rounded-lg bg-surface2 p-3 last:mb-0">
                <div>
                  <p className="font-medium text-ink">{r.unit.block?.name ? `${r.unit.block.name} · ` : ''}{r.unit.unitNumber}</p>
                  <p className="text-xs text-faint">{r.role}{r.isPrimary ? ' · primary' : ''}</p>
                </div>
                <Badge tone={statusTone(r.unit.occupancyStatus)}>{r.unit.occupancyStatus.replace(/_/g, ' ')}</Badge>
              </div>
            ))
          )}
        </Panel>

        {/* Paid to date + dues breakdown */}
        <Panel title="My Dues">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm text-muted">Paid to date</span>
            <span className="font-display text-xl font-medium text-green">{money(paidToDate)}</span>
          </div>
          {unpaid.length === 0 ? (
            <p className="text-sm text-green">You're all settled 🎉</p>
          ) : (
            unpaid.slice(0, 4).map((i) => (
              <div key={i.id} className="flex items-center justify-between border-t border-line py-2 text-sm">
                <span className="text-muted">{i.invoiceNumber} · due {i.dueDate.slice(0, 10)}</span>
                <Badge tone={statusTone(i.status)}>{i.status.replace(/_/g, ' ')}</Badge>
              </div>
            ))
          )}
        </Panel>
      </div>

      {/* Quick actions */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <QuickAction icon={UserPlus} label="New visitor" onClick={() => navigate('/gate')} />
        <QuickAction icon={MessageSquareWarning} label="Raise issue" onClick={() => navigate('/complaints')} />
        <QuickAction icon={Siren} label="Emergency" tone="text-danger" onClick={() => navigate('/sos')} />
      </div>

      {/* Payment history */}
      <Panel className="mt-4" title="My payment history" subtitle="Download any bill or receipt">
        {myInvoices.length === 0 ? (
          <p className="text-sm text-faint">No bills yet</p>
        ) : (
          <div className="-my-1">
            {myInvoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-sm last:border-0">
                <div className="min-w-0">
                  <span className="font-medium text-ink">{i.invoiceNumber}</span>
                  <span className="ml-2 text-faint">due {i.dueDate.slice(0, 10)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted">{money(i.totalAmount)}</span>
                  <Badge tone={statusTone(i.status)}>{i.status.replace(/_/g, ' ')}</Badge>
                  <PillButton variant="plain" onClick={() => savePdf(`/billing/invoices/${i.id}/pdf`, `${i.invoiceNumber}-bill.pdf`)}>
                    <Download className="mr-1 inline h-3 w-3" /> Bill
                  </PillButton>
                  {Number(i.amountPaid) > 0 && (
                    <PillButton onClick={() => savePdf(`/billing/invoices/${i.id}/receipt`, `${i.invoiceNumber}-receipt.pdf`)}>
                      <Download className="mr-1 inline h-3 w-3" /> Receipt
                    </PillButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Notices + complaints */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Latest Notices" aside={<Megaphone className="h-5 w-5 text-green" />}>
          {(notices.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-faint">No notices</p>
          ) : (
            notices.data?.items.map((n) => (
              <div key={n.id} className="flex items-center justify-between border-t border-line py-2 first:border-0">
                <p className="text-sm font-medium text-ink">{n.isPinned ? '📌 ' : ''}{n.title}</p>
                <Badge tone={statusTone(n.priority)}>{n.priority}</Badge>
              </div>
            ))
          )}
        </Panel>

        <Panel title="My Complaints" aside={<MessageSquareWarning className="h-5 w-5 text-green" />}>
          {(complaints.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-faint">No tickets raised</p>
          ) : (
            complaints.data?.items.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-t border-line py-2 text-sm first:border-0">
                <span className="text-ink">{c.ticketNumber} · {c.title}</span>
                <Badge tone={statusTone(c.status)}>{c.status.replace(/_/g, ' ')}</Badge>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, tone }: { icon: typeof Home; label: string; onClick: () => void; tone?: string }) {
  return (
    <button onClick={onClick} className="card flex flex-col items-center gap-2 p-4 transition hover:bg-surface2">
      <Icon className={`h-6 w-6 ${tone ?? 'text-green'}`} />
      <span className="text-sm font-medium text-ink">{label}</span>
    </button>
  );
}
