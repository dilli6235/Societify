import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Siren, Check, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Select, Textarea, Input } from '@/components/ui/Input';
import { Badge, statusTone } from '@/components/ui/Badge';
import { useHasRole } from '@/features/auth/guards';
import { useList, useApiMutation } from '@/lib/hooks';
import { post } from '@/lib/apiClient';

interface Sos {
  id: string;
  type: string;
  message: string | null;
  location: string | null;
  status: string;
  createdAt: string;
}

export function SosPage() {
  const [open, setOpen] = useState(false);
  const responder = useHasRole('SECURITY_GUARD', 'SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN');
  const alerts = useList<Sos>(['sos'], '/sos');
  const { register, handleSubmit, reset } = useForm<{ type: string; message?: string; location?: string }>();

  const raise = useApiMutation((v: object) => post('/sos', v), { invalidate: [['sos']], successMessage: 'Emergency alert raised' });
  const act = useApiMutation(({ id, action }: { id: string; action: string }) => post(`/sos/${id}/${action}`), {
    invalidate: [['sos']],
    successMessage: 'Updated',
  });

  const columns: Column<Sos>[] = [
    { header: 'Type', cell: (s) => <Badge tone={s.type === 'MEDICAL' || s.type === 'FIRE' ? 'red' : 'amber'}>{s.type}</Badge> },
    { header: 'Message', cell: (s) => s.message ?? '—' },
    { header: 'Location', cell: (s) => s.location ?? '—' },
    { header: 'Raised', cell: (s) => new Date(s.createdAt).toLocaleString() },
    { header: 'Status', cell: (s) => <Badge tone={statusTone(s.status)}>{s.status}</Badge> },
    {
      header: '',
      cell: (s) =>
        responder ? (
          <div className="flex gap-1">
            {s.status === 'ACTIVE' && (
              <button title="Acknowledge" onClick={() => act.mutate({ id: s.id, action: 'acknowledge' })} className="rounded p-1 text-amber-600 hover:bg-amber-50"><Check className="h-4 w-4" /></button>
            )}
            {s.status !== 'RESOLVED' && (
              <button title="Resolve" onClick={() => act.mutate({ id: s.id, action: 'resolve' })} className="rounded p-1 text-emerald-600 hover:bg-emerald-50"><CheckCheck className="h-4 w-4" /></button>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Emergency / SOS"
        subtitle="Panic alerts raised by residents"
        action={<Button variant="danger" onClick={() => setOpen(true)}><Siren className="h-4 w-4" /> Raise SOS</Button>}
      />
      <Table columns={columns} rows={alerts.data?.items ?? []} rowKey={(s) => s.id} loading={alerts.isLoading} empty="No alerts" />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Raise an emergency alert"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="danger" loading={raise.isPending} onClick={handleSubmit(async (v) => { await raise.mutateAsync(v); reset(); setOpen(false); })}>Send alert</Button></>}
      >
        <div className="space-y-4">
          <Field label="Type"><Select {...register('type')} defaultValue="OTHER">{['MEDICAL', 'FIRE', 'SECURITY', 'OTHER'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="Location"><Input placeholder="Block A, 3rd floor" {...register('location')} /></Field>
          <Field label="Message"><Textarea placeholder="Describe the emergency" {...register('message')} /></Field>
        </div>
      </Modal>
    </div>
  );
}
