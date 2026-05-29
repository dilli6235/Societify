import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge, statusTone } from '@/components/ui/Badge';
import { useList, useApiMutation } from '@/lib/hooks';
import { getOne, post, patch, del } from '@/lib/apiClient';
import type { Invoice, Unit } from '@/lib/types';
import { ExpensesTab } from './ExpensesTab';

const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

type BillingTab = 'invoices' | 'expenses';

export function BillingPage() {
  const [tab, setTab] = useState<BillingTab>('invoices');
  return (
    <div>
      <PageHeader title="Billing" subtitle="Maintenance invoices, payments & society expenses" />
      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {(['invoices', 'expenses'] as BillingTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'rounded-md px-4 py-1.5 text-sm font-medium capitalize ' +
              (tab === t ? 'bg-brand-600 text-white' : 'text-slate-600')
            }
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'invoices' ? <InvoicesTab /> : <ExpensesTab />}
    </div>
  );
}

function InvoicesTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const invoices = useList<Invoice>(['invoices'], '/billing/invoices');

  const columns: Column<Invoice>[] = [
    { header: 'Invoice', cell: (i) => <span className="font-medium text-slate-800">{i.invoiceNumber}</span> },
    { header: 'Unit', cell: (i) => i.unit?.unitNumber ?? '—' },
    {
      header: 'Resident',
      cell: (i) => {
        const u = i.unit?.residencies?.[0]?.user;
        if (!u) return <span className="text-slate-400">—</span>;
        return (
          <div className="text-xs">
            <div className="font-medium text-slate-700">{u.fullName}</div>
            <div className="text-slate-500">{u.phone ?? '—'} · {u.email}</div>
          </div>
        );
      },
    },
    { header: 'Total', cell: (i) => money(i.totalAmount) },
    { header: 'Paid', cell: (i) => money(i.amountPaid) },
    { header: 'Due', cell: (i) => i.dueDate.slice(0, 10) },
    { header: 'Status', cell: (i) => <Badge tone={statusTone(i.status)}>{i.status.replace(/_/g, ' ')}</Badge> },
  ];

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New invoice</Button>
      </div>
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

type Pay = NonNullable<Invoice['payments']>[number];

function InvoiceDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, refetch } = useQuery({ queryKey: ['invoice', id], queryFn: () => getOne<Invoice>(`/billing/invoices/${id}`) });
  const [amount, setAmount] = useState('');
  const [editing, setEditing] = useState<Pay | null>(null);
  const issue = useApiMutation((_v: void) => post(`/billing/invoices/${id}/issue`), { invalidate: [['invoices']], successMessage: 'Invoice issued' });
  const payment = useApiMutation(
    (v: { amount: number; method: string }) => post('/billing/payments/manual', { invoiceId: id, ...v }),
    { invalidate: [['invoices']], successMessage: 'Payment recorded' },
  );
  const removePayment = useApiMutation((pid: string) => del(`/billing/payments/${pid}`), { invalidate: [['invoices']], successMessage: 'Payment removed' });
  const [showEdit, setShowEdit] = useState(false);

  return (
    <Modal open onClose={onClose} title={data ? `Invoice ${data.invoiceNumber}` : 'Invoice'}>
      {!data ? null : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge tone={statusTone(data.status)}>{data.status.replace(/_/g, ' ')}</Badge>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">Due {data.dueDate.slice(0, 10)}</span>
              {data.status !== 'PAID' && data.status !== 'CANCELLED' && (
                <button onClick={() => setShowEdit(true)} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </div>
          </div>

          {/* Resident the invoice is for */}
          {data.unit?.residencies?.[0]?.user && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Resident</p>
              <p className="font-medium text-slate-800">{data.unit.residencies[0].user.fullName}</p>
              <p className="text-slate-500">{data.unit.residencies[0].user.phone ?? '—'} · {data.unit.residencies[0].user.email}</p>
              <p className="text-xs text-slate-400">Unit {data.unit.unitNumber}</p>
            </div>
          )}
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
          <div className="border-t border-slate-200 pt-2 text-sm">
            {(Number(data.taxAmount ?? 0) > 0 || Number(data.lateFee ?? 0) > 0) && (
              <div className="space-y-0.5 text-slate-500">
                {Number(data.taxAmount ?? 0) > 0 && (
                  <div className="flex justify-between"><span>Tax</span><span>{money(data.taxAmount!)}</span></div>
                )}
                {Number(data.lateFee ?? 0) > 0 && (
                  <div className="flex justify-between"><span>Late-payment penalty</span><span className="text-red-600">{money(data.lateFee!)}</span></div>
                )}
              </div>
            )}
            <div className="mt-1 flex justify-between">
              <span className="font-medium text-slate-800">Total</span>
              <span className="font-semibold text-slate-900">{money(data.totalAmount)} <span className="text-slate-400">(paid {money(data.amountPaid)})</span></span>
            </div>
          </div>

          {(data.payments ?? []).length > 0 && (
            <div className="border-t border-slate-200 pt-3">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Recorded payments</p>
              {data.payments?.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-slate-600">{money(p.amount)} · {p.method} · {p.status}</span>
                  {p.gatewayProvider === 'manual' && p.status === 'SUCCESS' && (
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(p)} className="text-slate-400 hover:text-brand-600" title="Edit this payment">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removePayment.mutateAsync(p.id).then(() => refetch())}
                        className="text-slate-400 hover:text-red-500"
                        title="Delete / reverse this payment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

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
      {editing && <PaymentEdit payment={editing} onClose={() => { setEditing(null); refetch(); }} />}
      {showEdit && data && <EditInvoice invoice={data} onClose={() => { setShowEdit(false); refetch(); }} />}
    </Modal>
  );
}

function EditInvoice({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const { register, control, handleSubmit } = useForm<{
    dueDate: string;
    taxAmount: number;
    lateFee: number;
    lineItems: { description: string; quantity: number; unitPrice: number }[];
  }>({
    defaultValues: {
      dueDate: invoice.dueDate.slice(0, 10),
      taxAmount: Number(invoice.taxAmount ?? 0),
      lateFee: Number(invoice.lateFee ?? 0),
      lineItems: (invoice.lineItems ?? []).map((li) => ({
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
      })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  const save = useApiMutation(
    (v: { dueDate: string; taxAmount: number; lateFee: number; lineItems: { description: string; quantity: number; unitPrice: number }[] }) =>
      patch(`/billing/invoices/${invoice.id}`, {
        dueDate: v.dueDate,
        taxAmount: Number(v.taxAmount),
        lateFee: Number(v.lateFee),
        lineItems: v.lineItems.map((l) => ({ description: l.description, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
      }),
    { invalidate: [['invoices']], successMessage: 'Invoice updated' },
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${invoice.invoiceNumber}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} onClick={handleSubmit(async (v) => { await save.mutateAsync(v); onClose(); })}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Due date"><Input type="date" {...register('dueDate', { required: true })} /></Field>

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
          <Field label="Tax amount (₹)"><Input type="number" step="0.01" {...register('taxAmount')} /></Field>
          <Field label="Late-payment penalty (₹)"><Input type="number" step="0.01" {...register('lateFee')} /></Field>
        </div>
        <p className="text-xs text-slate-500">Subtotal and total are recomputed automatically (subtotal + tax + late fee). PAID and CANCELLED invoices can't be edited.</p>
      </div>
    </Modal>
  );
}

function PaymentEdit({ payment, onClose }: { payment: Pay; onClose: () => void }) {
  const [amount, setAmount] = useState(String(payment.amount));
  const [method, setMethod] = useState(payment.method);
  const [reference, setReference] = useState('');
  const save = useApiMutation(
    (v: { amount: number; method: string; reference?: string }) => patch(`/billing/payments/${payment.id}`, v),
    { invalidate: [['invoices']], successMessage: 'Payment updated' },
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit payment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={save.isPending}
            onClick={async () => {
              await save.mutateAsync({ amount: Number(amount), method, reference: reference || undefined });
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Amount (₹)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {['CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI'].map((m) => <option key={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Reference (cheque/UTR no., optional)">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque #" />
        </Field>
        <p className="text-xs text-slate-500">Editing this payment will recompute the invoice's paid amount and status.</p>
      </div>
    </Modal>
  );
}
