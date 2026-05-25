import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Check, X, LogIn, LogOut } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge, statusTone } from '@/components/ui/Badge';
import { useHasRole } from '@/features/auth/guards';
import { useList, useApiMutation } from '@/lib/hooks';
import { post } from '@/lib/apiClient';
import type { GatePass, Unit } from '@/lib/types';

export function GatePage() {
  const [open, setOpen] = useState(false);
  const isGuard = useHasRole('SECURITY_GUARD', 'SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN');
  const passes = useList<GatePass>(['gate-passes'], '/gate/passes');

  const act = useApiMutation(
    ({ id, action }: { id: string; action: string }) => post(`/gate/passes/${id}/${action}`),
    { invalidate: [['gate-passes']], successMessage: 'Done' },
  );

  const columns: Column<GatePass>[] = [
    { header: 'Visitor', cell: (p) => <span className="font-medium text-slate-800">{p.visitorName}</span> },
    { header: 'Type', cell: (p) => p.type.replace(/_/g, ' ') },
    { header: 'Unit', cell: (p) => p.unit?.unitNumber ?? '—' },
    { header: 'Status', cell: (p) => <Badge tone={statusTone(p.status)}>{p.status.replace(/_/g, ' ')}</Badge> },
    {
      header: 'Actions',
      cell: (p) => (
        <div className="flex gap-1">
          {p.status === 'PENDING_APPROVAL' && (
            <>
              <button title="Approve" onClick={() => act.mutate({ id: p.id, action: 'approve' })} className="rounded p-1 text-emerald-600 hover:bg-emerald-50"><Check className="h-4 w-4" /></button>
              <button title="Deny" onClick={() => act.mutate({ id: p.id, action: 'deny' })} className="rounded p-1 text-red-600 hover:bg-red-50"><X className="h-4 w-4" /></button>
            </>
          )}
          {isGuard && p.status === 'APPROVED' && (
            <button title="Check in" onClick={() => act.mutate({ id: p.id, action: 'check-in' })} className="rounded p-1 text-brand-600 hover:bg-brand-50"><LogIn className="h-4 w-4" /></button>
          )}
          {isGuard && p.status === 'CHECKED_IN' && (
            <button title="Check out" onClick={() => act.mutate({ id: p.id, action: 'check-out' })} className="rounded p-1 text-slate-600 hover:bg-slate-100"><LogOut className="h-4 w-4" /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Gate & Security"
        subtitle="Visitor passes and check-in log"
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New pass</Button>}
      />
      <Table columns={columns} rows={passes.data?.items ?? []} rowKey={(p) => p.id} loading={passes.isLoading} />
      {open && <CreatePass onClose={() => setOpen(false)} />}
    </div>
  );
}

function CreatePass({ onClose }: { onClose: () => void }) {
  const units = useList<Unit>(['units'], '/properties/units');
  const { register, handleSubmit } = useForm<{ type: string; visitorName: string; visitorPhone?: string; unitId?: string }>();
  const create = useApiMutation((v: object) => post('/gate/passes', v), { invalidate: [['gate-passes']], successMessage: 'Pass created' });

  return (
    <Modal
      open
      onClose={onClose}
      title="New gate pass"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={create.isPending} onClick={handleSubmit(async (v) => { await create.mutateAsync({ ...v, unitId: v.unitId || undefined }); onClose(); })}>Create</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Type">
          <Select {...register('type')} defaultValue="VISITOR">
            {['VISITOR', 'DELIVERY', 'CAB', 'DAILY_HELP', 'VENDOR', 'GUEST'].map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Visitor name"><Input {...register('visitorName', { required: true })} /></Field>
        <Field label="Visitor phone"><Input {...register('visitorPhone')} /></Field>
        <Field label="Visiting unit">
          <Select {...register('unitId')}>
            <option value="">Select a unit…</option>
            {units.data?.items.map((u) => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
