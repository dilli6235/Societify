import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, LogIn, LogOut } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useHasRole } from '@/features/auth/guards';
import { useList, useApiMutation } from '@/lib/hooks';
import { post } from '@/lib/apiClient';
import { toast } from '@/components/ui/toast';

interface Staff { id: string; fullName: string; phone: string | null; role: string; code: string; isActive: boolean }
interface Attendance { id: string; direction: string; timestamp: string; staff?: { fullName: string; role: string } }
const ROLES = ['MAID', 'COOK', 'DRIVER', 'GARDENER', 'SECURITY', 'ELECTRICIAN', 'PLUMBER', 'OTHER'];

export function StaffPage() {
  const [tab, setTab] = useState<'staff' | 'attendance'>('staff');
  return (
    <div>
      <PageHeader title="Staff & Daily Help" subtitle="Domestic staff and gate attendance" />
      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {(['staff', 'attendance'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('rounded-md px-4 py-1.5 text-sm font-medium capitalize', tab === t ? 'bg-brand-600 text-white' : 'text-slate-600')}>{t}</button>
        ))}
      </div>
      {tab === 'staff' ? <StaffTab /> : <AttendanceTab />}
    </div>
  );
}

function StaffTab() {
  const [open, setOpen] = useState(false);
  const canManage = useHasRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN');
  const staff = useList<Staff>(['staff'], '/staff');
  const { register, handleSubmit, reset } = useForm<{ fullName: string; phone?: string; role: string }>();
  const create = useApiMutation((v: object) => post('/staff', v), { invalidate: [['staff']], successMessage: 'Staff added' });

  const columns: Column<Staff>[] = [
    { header: 'Name', cell: (s) => <span className="font-medium text-slate-800">{s.fullName}</span> },
    { header: 'Role', cell: (s) => <Badge tone="blue">{s.role}</Badge> },
    { header: 'Phone', cell: (s) => s.phone ?? '—' },
    { header: 'Gate code', cell: (s) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{s.code}</code> },
    { header: 'Active', cell: (s) => <Badge tone={s.isActive ? 'green' : 'gray'}>{s.isActive ? 'Yes' : 'No'}</Badge> },
  ];

  return (
    <>
      {canManage && <div className="mb-3 flex justify-end"><Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add staff</Button></div>}
      <Table columns={columns} rows={staff.data?.items ?? []} rowKey={(s) => s.id} loading={staff.isLoading} />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add staff member"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button loading={create.isPending} onClick={handleSubmit(async (v) => { await create.mutateAsync(v); reset(); setOpen(false); })}>Add</Button></>}
      >
        <div className="space-y-4">
          <Field label="Full name"><Input {...register('fullName', { required: true })} /></Field>
          <Field label="Phone"><Input {...register('phone')} /></Field>
          <Field label="Role"><Select {...register('role')} defaultValue="MAID">{ROLES.map((r) => <option key={r}>{r}</option>)}</Select></Field>
        </div>
      </Modal>
    </>
  );
}

function AttendanceTab() {
  const isGuard = useHasRole('SECURITY_GUARD', 'SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN');
  const logs = useList<Attendance>(['staff-attendance'], '/staff/attendance');
  const [code, setCode] = useState('');
  const mark = useApiMutation(
    (v: { code: string; direction: string }) => post('/staff/attendance', v),
    { invalidate: [['staff-attendance']] },
  );

  const columns: Column<Attendance>[] = [
    { header: 'Staff', cell: (a) => a.staff?.fullName ?? '—' },
    { header: 'Role', cell: (a) => a.staff?.role ?? '—' },
    { header: 'Direction', cell: (a) => <Badge tone={a.direction === 'IN' ? 'green' : 'gray'}>{a.direction}</Badge> },
    { header: 'Time', cell: (a) => new Date(a.timestamp).toLocaleString() },
  ];

  const submit = async (direction: 'IN' | 'OUT') => {
    if (!code.trim()) return toast.error('Enter the staff gate code');
    await mark.mutateAsync({ code: code.trim(), direction });
    toast.success(`Marked ${direction}`);
    setCode('');
  };

  return (
    <>
      {isGuard && (
        <div className="card mb-4 flex items-end gap-2 p-4">
          <Field label="Staff gate code"><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="STF-XXXXXX" /></Field>
          <Button size="sm" loading={mark.isPending} onClick={() => submit('IN')}><LogIn className="h-4 w-4" /> In</Button>
          <Button size="sm" variant="secondary" loading={mark.isPending} onClick={() => submit('OUT')}><LogOut className="h-4 w-4" /> Out</Button>
        </div>
      )}
      <Table columns={columns} rows={logs.data?.items ?? []} rowKey={(a) => a.id} loading={logs.isLoading} empty="No attendance records" />
    </>
  );
}
