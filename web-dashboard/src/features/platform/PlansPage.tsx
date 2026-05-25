import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useList, useApiMutation } from '@/lib/hooks';
import { post, del } from '@/lib/apiClient';

interface Plan {
  id: string;
  name: string;
  priceMonthly: string;
  maxUnits: number;
  isActive: boolean;
}

export function PlatformPlansPage() {
  const [open, setOpen] = useState(false);
  const plans = useList<Plan>(['platform-plans'], '/platform/plans');
  const { register, handleSubmit, reset } = useForm<{ name: string; priceMonthly: number; maxUnits: number }>();

  const create = useApiMutation(
    (v: { name: string; priceMonthly: number; maxUnits: number }) =>
      post('/platform/plans', { ...v, priceMonthly: Number(v.priceMonthly), maxUnits: Number(v.maxUnits), features: {} }),
    { invalidate: [['platform-plans']], successMessage: 'Plan created' },
  );
  const remove = useApiMutation((id: string) => del(`/platform/plans/${id}`), {
    invalidate: [['platform-plans']],
    successMessage: 'Plan deleted',
  });

  const columns: Column<Plan>[] = [
    { header: 'Name', cell: (p) => <span className="font-medium text-slate-800">{p.name}</span> },
    { header: 'Price / mo', cell: (p) => `₹${Number(p.priceMonthly).toLocaleString('en-IN')}` },
    { header: 'Max units', cell: (p) => p.maxUnits },
    { header: 'Active', cell: (p) => <Badge tone={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'Yes' : 'No'}</Badge> },
    {
      header: '',
      cell: (p) => (
        <button onClick={() => remove.mutate(p.id)} className="text-slate-400 hover:text-red-500" title="Delete plan">
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Subscription plans"
        subtitle="Plans societies can subscribe to"
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New plan</Button>}
      />
      <Table columns={columns} rows={plans.data?.items ?? []} rowKey={(p) => p.id} loading={plans.isLoading} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New plan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={create.isPending} onClick={handleSubmit(async (v) => { await create.mutateAsync(v); reset(); setOpen(false); })}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name"><Input placeholder="Pro" {...register('name', { required: true })} /></Field>
          <Field label="Price per month (₹)"><Input type="number" {...register('priceMonthly', { required: true })} /></Field>
          <Field label="Max units"><Input type="number" {...register('maxUnits', { required: true })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
