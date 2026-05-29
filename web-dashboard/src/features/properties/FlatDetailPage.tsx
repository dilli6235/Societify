import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Diamond, Dot } from 'lucide-react';
import { getOne, getList, downloadFile } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { StatCard } from '@/components/ui/StatCard';
import { Panel } from '@/components/ui/Panel';
import { IdBlock, KV } from '@/components/ui/IdBlock';
import { Badge, statusTone } from '@/components/ui/Badge';
import { PillButton } from '@/components/ui/PillButton';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';
import { short } from '@/components/ui/charts';
import { useHasRole } from '@/features/auth/guards';
import type { Invoice } from '@/lib/types';

interface FlatResidency {
  id: string;
  role: 'OWNER' | 'TENANT' | 'FAMILY_MEMBER';
  isPrimary: boolean;
  movedInAt: string;
  rentAmount: string | null;
  user: { id: string; fullName: string; email: string; phone: string | null };
}

interface UnitDetail {
  id: string;
  unitNumber: string;
  floor: number | null;
  type: string;
  carpetAreaSqft: string | number | null;
  occupancyStatus: 'OWNER_OCCUPIED' | 'RENTED' | 'VACANT';
  block?: { id: string; name: string } | null;
  residencies?: FlatResidency[];
}

interface SocietyConfig {
  maintenanceMethod: 'FIXED' | 'PER_SQFT';
  maintenanceFixedAmount: string | null;
  maintenanceRatePerSqft: string | null;
}

const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const savePdf = (url: string, filename: string) =>
  downloadFile(url, filename).catch(() => toast.error('Could not download PDF'));

export function FlatDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const isManager = useHasRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER');

  const unit = useQuery({ queryKey: ['unit', id], queryFn: () => getOne<UnitDetail>(`/properties/units/${id}`) });
  const society = useQuery({ queryKey: ['society'], queryFn: () => getOne<SocietyConfig>('/properties/society') });
  const invoices = useQuery({
    queryKey: ['invoices', 'unit', id],
    queryFn: () => getList<Invoice>('/billing/invoices', { unitId: id, pageSize: 100 }),
    enabled: isManager,
  });

  if (unit.isLoading || !unit.data) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  const u = unit.data;
  const active = u.residencies ?? [];
  const owner = active.find((r) => r.role === 'OWNER');
  const resident = active.find((r) => r.isPrimary) ?? active[0];
  const area = Number(u.carpetAreaSqft ?? 0);

  const maintenance =
    society.data?.maintenanceMethod === 'PER_SQFT'
      ? Math.round(Number(society.data?.maintenanceRatePerSqft ?? 0) * area)
      : Number(society.data?.maintenanceFixedAmount ?? 0);
  const maintNote =
    society.data?.maintenanceMethod === 'PER_SQFT'
      ? `₹${society.data?.maintenanceRatePerSqft ?? 0}/sqft × ${area}`
      : 'fixed per unit';

  const bills = invoices.data?.items ?? [];
  const outstanding = bills
    .filter((b) => b.status !== 'PAID' && b.status !== 'CANCELLED')
    .reduce((s, b) => s + (Number(b.totalAmount) - Number(b.amountPaid)), 0);
  const paidToDate = bills.reduce((s, b) => s + Number(b.amountPaid), 0);

  return (
    <div>
      <button onClick={() => navigate('/properties')} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Properties
      </button>
      <PageHeader
        title={`Flat ${u.unitNumber}`}
        subtitle={`${u.block?.name ? `${u.block.name} · ` : ''}${area ? `${area} sq.ft · ` : ''}${u.type}`}
        action={<Badge tone={statusTone(u.occupancyStatus)}>{u.occupancyStatus.replace(/_/g, ' ')}</Badge>}
      />

      {/* Owner + resident */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <IdBlock role="Owner" tone="owner" glyph={<Diamond className="h-3 w-3" />}>
          {owner ? (
            <>
              <KV k="Name" v={owner.user.fullName} />
              <KV k="Phone" v={owner.user.phone ?? '—'} />
              <KV k="Email" v={owner.user.email} />
              <KV k="Owns since" v={owner.movedInAt.slice(0, 10)} />
            </>
          ) : (
            <p className="text-sm text-faint">No owner on record.</p>
          )}
        </IdBlock>

        <IdBlock role="Current resident" tone="resident" glyph={<Dot className="h-4 w-4" />}>
          {resident ? (
            <>
              <KV k="Name" v={resident.user.fullName} />
              <KV k="Phone" v={resident.user.phone ?? '—'} />
              <KV k="Type" v={resident.role === 'OWNER' ? 'Owner-occupant' : resident.role.replace(/_/g, ' ')} />
              {resident.rentAmount && <KV k="Rent" v={money(resident.rentAmount)} />}
            </>
          ) : (
            <p className="text-sm text-faint">Vacant — no active resident.</p>
          )}
        </IdBlock>
      </div>

      {/* Money cards */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Monthly maintenance" value={short(maintenance)} foot={maintNote} />
        <StatCard
          label="Outstanding"
          value={short(outstanding)}
          trend={outstanding > 0 ? 'down' : undefined}
          foot={<>{bills.filter((b) => b.status !== 'PAID' && b.status !== 'CANCELLED').length} unpaid</>}
        />
        <StatCard label="Paid to date" value={short(paidToDate)} foot={`${bills.filter((b) => b.status === 'PAID').length} bills`} />
      </div>

      {/* Bill history */}
      <Panel className="mt-4" title="Bill history" subtitle="Maintenance invoices for this flat">
        {!isManager ? (
          <p className="py-6 text-center text-sm text-faint">Billing details are visible to admins and committee.</p>
        ) : invoices.isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : bills.length === 0 ? (
          <p className="py-6 text-center text-sm text-faint">No bills for this flat yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.04em] text-faint">
                <th className="py-2.5 pr-3 font-medium">Bill no.</th>
                <th className="py-2.5 pr-3 font-medium">Issued</th>
                <th className="py-2.5 pr-3 font-medium">Amount</th>
                <th className="py-2.5 pr-3 font-medium">Due</th>
                <th className="py-2.5 pr-3 font-medium">Status</th>
                <th className="py-2.5 text-right font-medium">Document</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0">
                  <td className="py-2.5 pr-3 font-medium text-ink">{b.invoiceNumber}</td>
                  <td className="py-2.5 pr-3 text-muted">{b.issueDate.slice(0, 10)}</td>
                  <td className="py-2.5 pr-3">{money(b.totalAmount)}</td>
                  <td className="py-2.5 pr-3 text-muted">{b.dueDate.slice(0, 10)}</td>
                  <td className="py-2.5 pr-3"><Badge tone={statusTone(b.status)}>{b.status.replace(/_/g, ' ')}</Badge></td>
                  <td className="py-2.5 text-right">
                    <div className="inline-flex gap-1.5">
                      <PillButton variant="plain" onClick={() => savePdf(`/billing/invoices/${b.id}/pdf`, `${b.invoiceNumber}-bill.pdf`)}>
                        <Download className="mr-1 inline h-3 w-3" /> Bill
                      </PillButton>
                      {Number(b.amountPaid) > 0 && (
                        <PillButton onClick={() => savePdf(`/billing/invoices/${b.id}/receipt`, `${b.invoiceNumber}-receipt.pdf`)}>
                          <Download className="mr-1 inline h-3 w-3" /> Receipt
                        </PillButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {isManager && (
          <div className="mt-3 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => navigate('/billing')}>Manage in Billing</Button>
          </div>
        )}
      </Panel>
    </div>
  );
}
