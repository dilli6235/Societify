import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useList, useApiMutation } from '@/lib/hooks';
import { post, patch } from '@/lib/apiClient';
import { exportCsv } from '@/lib/csv';

interface Residency {
  id: string;
  role: string;
  isPrimary: boolean;
  rentAmount: string | null;
  depositAmount: string | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  unit?: { id: string; unitNumber: string };
  user?: { id: string; fullName: string; email: string; phone: string | null };
}
interface Unit { id: string; unitNumber: string }
interface UserRow { id: string; fullName: string; email: string }

interface FormVals {
  userId: string;
  unitId: string;
  role: string;
  isPrimary: boolean;
  rentAmount?: string;
  depositAmount?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
}

const money = (v: string | null) => (v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`);

export function ResidentsTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const [edit, setEdit] = useState<Residency | null>(null);
  const residencies = useList<Residency>(['residencies'], '/properties/residencies', { activeOnly: 'true', pageSize: 200 });

  const rows = residencies.data?.items ?? [];

  const columns: Column<Residency>[] = [
    { header: 'Name', cell: (r) => <span className="font-medium text-slate-800">{r.user?.fullName}</span> },
    { header: 'Phone', cell: (r) => r.user?.phone ?? '—' },
    { header: 'Email', cell: (r) => <span className="text-xs text-slate-600">{r.user?.email}</span> },
    { header: 'Unit', cell: (r) => r.unit?.unitNumber ?? '—' },
    { header: 'Role', cell: (r) => <Badge tone={r.role === 'OWNER' ? 'green' : r.role === 'TENANT' ? 'blue' : 'gray'}>{r.role}{r.isPrimary ? ' ★' : ''}</Badge> },
    { header: 'Rent', cell: (r) => money(r.rentAmount) },
    { header: 'Deposit', cell: (r) => money(r.depositAmount) },
    { header: 'Lease', cell: (r) => (r.leaseStartDate ? `${r.leaseStartDate.slice(0, 10)} → ${r.leaseEndDate?.slice(0, 10) ?? '…'}` : '—') },
  ];

  const doExport = () => {
    exportCsv(
      'residents.csv',
      ['Name', 'Email', 'Phone', 'Unit', 'Role', 'Primary', 'Rent', 'Deposit', 'Lease start', 'Lease end'],
      rows.map((r) => [
        r.user?.fullName, r.user?.email, r.user?.phone, r.unit?.unitNumber, r.role,
        r.isPrimary ? 'Yes' : 'No', r.rentAmount, r.depositAmount, r.leaseStartDate?.slice(0, 10), r.leaseEndDate?.slice(0, 10),
      ]),
    );
  };

  return (
    <>
      <div className="mb-3 flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={doExport}><Download className="h-4 w-4" /> Export CSV</Button>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add resident</Button>
      </div>
      <Table columns={columns} rows={rows} rowKey={(r) => r.id} loading={residencies.isLoading} empty="No residents assigned yet" onRowClick={(r) => setEdit(r)} />
      {createOpen && <ResidencyForm onClose={() => setCreateOpen(false)} />}
      {edit && <ResidencyForm existing={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function ResidencyForm({ existing, onClose }: { existing?: Residency; onClose: () => void }) {
  const isEdit = Boolean(existing);
  const units = useList<Unit>(['units'], '/properties/units', { pageSize: 200 });
  const users = useList<UserRow>(['users'], '/users', { pageSize: 200 });
  const { register, handleSubmit, watch } = useForm<FormVals>({
    defaultValues: existing
      ? {
          role: existing.role,
          isPrimary: existing.isPrimary,
          rentAmount: existing.rentAmount ?? undefined,
          depositAmount: existing.depositAmount ?? undefined,
          leaseStartDate: existing.leaseStartDate?.slice(0, 10),
          leaseEndDate: existing.leaseEndDate?.slice(0, 10),
        }
      : { role: 'OWNER', isPrimary: true },
  });
  const role = watch('role');

  const save = useApiMutation(
    (v: FormVals) => {
      const rental = {
        rentAmount: v.rentAmount ? Number(v.rentAmount) : null,
        depositAmount: v.depositAmount ? Number(v.depositAmount) : null,
        leaseStartDate: v.leaseStartDate || null,
        leaseEndDate: v.leaseEndDate || null,
      };
      return isEdit
        ? patch(`/properties/residencies/${existing!.id}`, { role: v.role, isPrimary: v.isPrimary, ...rental })
        : post('/properties/residencies', { userId: v.userId, unitId: v.unitId, role: v.role, isPrimary: v.isPrimary, ...rental });
    },
    { invalidate: [['residencies'], ['units']], successMessage: isEdit ? 'Resident updated' : 'Resident added' },
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit — ${existing?.user?.fullName}` : 'Add resident to a unit'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} onClick={handleSubmit(async (v) => { await save.mutateAsync(v); onClose(); })}>{isEdit ? 'Save' : 'Add'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {!isEdit && (
          <>
            <Field label="Person">
              <Select {...register('userId', { required: true })}>
                <option value="">Select a person…</option>
                {users.data?.items.map((u) => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
              </Select>
            </Field>
            <Field label="Unit">
              <Select {...register('unitId', { required: true })}>
                <option value="">Select a unit…</option>
                {units.data?.items.map((u) => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
              </Select>
            </Field>
          </>
        )}
        <Field label="Role">
          <Select {...register('role')}>{['OWNER', 'TENANT', 'FAMILY_MEMBER'].map((r) => <option key={r}>{r}</option>)}</Select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" {...register('isPrimary')} /> Primary contact (billing)</label>

        {role === 'TENANT' && (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Rental details</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Monthly rent (₹)"><Input type="number" {...register('rentAmount')} /></Field>
              <Field label="Deposit (₹)"><Input type="number" {...register('depositAmount')} /></Field>
              <Field label="Lease start"><Input type="date" {...register('leaseStartDate')} /></Field>
              <Field label="Lease end"><Input type="date" {...register('leaseEndDate')} /></Field>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
