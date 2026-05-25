import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge, statusTone } from '@/components/ui/Badge';
import { useList, useApiMutation } from '@/lib/hooks';
import { getOne, post } from '@/lib/apiClient';
import type { Invoice, Unit } from '@/lib/types';

const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function BillingPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const invoices = useList<Invoice>(['invoices'], '/billing/invoices');

  const columns: Column<Invoice>[] = [
    { header: 'Invoice', cell: (i) => <span className="font-medium text-slate-800">{i.invoiceNumber}</span> },
    { header: 'Unit', cell: (i) => i.unit?.unitNumber ?? '—' },
    { header: 'Total', cell: (i) => money(i.totalAmount) },
    { header: 'Paid', cell: (i) => money(i.amountPaid) },
    { header: 'Due', cell: (i) => i.dueDate.slice(0, 10) },
    { header: 'Status', cell: (i) => <Badge tone={statusTone(i.status)}>{i.status.replace(/_/g, ' ')}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Maintenance invoices & payments"
        action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New invoice</Button>}
      />
      <Table
        columns={columns}
        rows={invoices.data?.items ?? []}
        rowKey={(i) => i.id}
        loading={invoices.isLoading}
        onRowClick={(i) => setDetailId(i.id)}
      />
      {createOpen && <CreateInvoice onClose={() => setCreateOpen(false)} />}
      {detailId && <InvoiceDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

interface CreateForm {
  unitId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  taxAmount: number;
  issueNow: boolean;
  lineItems: { description: string; quantity: number; unitPrice: number }[];
}

function CreateInvoice({ onClose }: { onClose: () => void }) {
  const units = useList<Unit>(['units'], '/properties/units');
  const { register, control, handleSubmit } = useForm<CreateForm>({
    defaultValues: { taxAmount: 0, issueNow: true, lineItems: [{ description: 'Maintenance charge', quantity: 1, unitPrice: 1500 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  const create = useApiMutation((v: CreateForm) => post('/billing/invoices', v), {
    invalidate: [['invoices']],
    successMessage: 'Invoice created',
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="New invoice"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={create.isPending}
            onClick={handleSubmit(async (v) => {
              await create.mutateAsync({
                ...v,
                taxAmount: Number(v.taxAmount),
                lineItems: v.lineItems.map((l) => ({ ...l, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
              });
              onClose();
            })}
          >
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Unit">
          <Select {...register('unitId', { required: true })}>
            <option value="">Select a unit…</option>
            {units.data?.items.map((u) => <option key={u.id} value={u.id}>{u.unitNumber}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Period start"><Input type="date" {...register('billingPeriodStart', { required: true })} /></Field>
          <Field label="Period end"><Input type="date" {...register('billingPeriodEnd', { required: true })} /></Field>
          <Field label="Due date"><Input type="date" {...register('dueDate', { required: true })} /></Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Line items</span>
            <Button size="sm" variant="ghost" onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {fields.map((f, idx) => (
              <div key={f.id} className="flex items-center gap-2">
                <Input className="flex-1" placeholder="Description" {...register(`lineItems.${idx}.description`, { required: true })} />
                <Input className="w-16" type="number" step="0.01" placeholder="Qty" {...register(`lineItems.${idx}.quantity`)} />
                <Input className="w-28" type="number" step="0.01" placeholder="Unit price" {...register(`lineItems.${idx}.unitPrice`)} />
                {fields.length > 1 && (
                  <button onClick={() => remove(idx)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tax amount"><Input type="number" step="0.01" {...register('taxAmount')} /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
            <input type="checkbox" {...register('issueNow')} /> Issue immediately
          </label>
        </div>
      </div>
    </Modal>
  );
}

function InvoiceDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, refetch } = useQuery({ queryKey: ['invoice', id], queryFn: () => getOne<Invoice>(`/billing/invoices/${id}`) });
  const [amount, setAmount] = useState('');
  const issue = useApiMutation((_v: void) => post(`/billing/invoices/${id}/issue`), { invalidate: [['invoices']], successMessage: 'Invoice issued' });
  const payment = useApiMutation(
    (v: { amount: number; method: string }) => post('/billing/payments/manual', { invoiceId: id, ...v }),
    { invalidate: [['invoices']], successMessage: 'Payment recorded' },
  );

  return (
    <Modal open onClose={onClose} title={data ? `Invoice ${data.invoiceNumber}` : 'Invoice'}>
      {!data ? null : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge tone={statusTone(data.status)}>{data.status.replace(/_/g, ' ')}</Badge>
            <span className="text-sm text-slate-500">Due {data.dueDate.slice(0, 10)}</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {data.lineItems?.map((li) => (
                <tr key={li.id} className="border-b border-slate-100">
                  <td className="py-2">{li.description}</td>
                  <td className="py-2 text-right text-slate-500">{li.quantity} × {money(li.unitPrice)}</td>
                  <td className="py-2 text-right font-medium">{money(li.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
            <span className="font-medium">Total</span>
            <span className="font-semibold">{money(data.totalAmount)} <span className="text-slate-400">(paid {money(data.amountPaid)})</span></span>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            {data.status === 'DRAFT' && (
              <Button size="sm" loading={issue.isPending} onClick={() => issue.mutateAsync().then(() => refetch())}>Issue invoice</Button>
            )}
            {['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(data.status) && (
              <div className="flex w-full items-end gap-2">
                <Field label="Record payment (₹)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
                <Button
                  size="sm"
                  loading={payment.isPending}
                  onClick={() => payment.mutateAsync({ amount: Number(amount), method: 'CASH' }).then(() => { setAmount(''); refetch(); })}
                >
                  Record cash
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
