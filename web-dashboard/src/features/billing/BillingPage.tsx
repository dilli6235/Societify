import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, Pencil, Bell, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge, statusTone } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Panel } from '@/components/ui/Panel';
import { short, ChartTooltip, ChartLegend } from '@/components/ui/charts';
import { useList, useApiMutation } from '@/lib/hooks';
import { getOne, post, patch, del, downloadFile } from '@/lib/apiClient';
import { toast } from '@/components/ui/toast';
import type { Invoice, Unit, DashboardSummary } from '@/lib/types';
import { ExpensesTab } from './ExpensesTab';

const savePdf = (url: string, filename: string) =>
  downloadFile(url, filename).catch(() => toast.error('Could not download PDF'));

const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

type BillingTab = 'invoices' | 'expenses';

export function BillingPage() {
  const [tab, setTab] = useState<BillingTab>('invoices');
  return (
    <div>
      <PageHeader title="Billing" subtitle="Maintenance invoices, payments & society expenses" />
      <div className="mb-4 inline-flex rounded-lg border border-line bg-surface p-1">
        {(['invoices', 'expenses'] as BillingTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'rounded-md px-4 py-1.5 text-sm font-medium capitalize ' +
              (tab === t ? 'bg-acid text-acid-ink' : 'text-muted hover:text-ink')
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

const PAID_PENDING = [
  { key: 'collected', label: 'Paid', color: '#3fcf8e' },
  { key: 'pending', label: 'Pending', color: '#e8b04b' },
] as const;

function InvoicesTab() {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const invoices = useList<Invoice>(['invoices'], '/billing/invoices');
  const summary = useQuery({ queryKey: ['dashboard', 'summary'], queryFn: () => getOne<DashboardSummary>('/dashboard/summary') });

  const generate = useApiMutation((_v: void) => post('/billing/invoices/generate'), {
    invalidate: [['invoices'], ['dashboard']],
    successMessage: "This month's bills generated",
  });
  const remind = useApiMutation((_v: void) => post('/billing/invoices/remind'), { successMessage: 'Reminders sent to unpaid flats' });

  const k = summary.data?.kpis;
  const perUnit = summary.data?.perUnit;

  const columns: Column<Invoice>[] = [
    { header: 'Invoice', cell: (i) => <span className="font-medium text-ink">{i.invoiceNumber}</span> },
    { header: 'Unit', cell: (i) => i.unit?.unitNumber ?? '—' },
    {
      header: 'Resident',
      cell: (i) => {
        const u = i.unit?.residencies?.[0]?.user;
        if (!u) return <span className="text-faint">—</span>;
        return (
          <div className="text-xs">
            <div className="font-medium text-ink">{u.fullName}</div>
            <div className="text-muted">{u.phone ?? '—'} · {u.email}</div>
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
      {/* Summary cards */}
      {k && perUnit && (
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Billed this month" value={short(k.billedThisMonth)} foot={`${k.billedUnits} bills`} />
          <StatCard label="Collected" value={short(k.collectedThisMonth)} trend="up" foot={<><b>{k.paidUnits} paid</b></>} />
          <StatCard label="Pending" value={short(k.pendingThisMonth)} trend="down" foot={<><b>{k.billedUnits - k.paidUnits} unpaid</b></>} />
          <StatCard
            label="Per unit"
            value={perUnit.method === 'FIXED' ? short(perUnit.fixedAmount ?? 0) : `₹${perUnit.ratePerSqft ?? 0}/sqft`}
            foot="maintenance"
          />
        </div>
      )}

      {/* Paid vs pending chart */}
      {summary.data && (
        <Panel
          className="mb-4"
          title="Paid vs pending"
          subtitle="By month"
          aside={<ChartLegend items={PAID_PENDING.map((s) => ({ label: s.label, color: s.color }))} />}
        >
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.data.series} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#8ba096', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `₹${v / 1000}k`} tick={{ fill: '#5f7268', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip />} />
                {PAID_PENDING.map((s) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} maxBarSize={28} radius={s.key === 'pending' ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" size="sm" loading={remind.isPending} onClick={() => remind.mutate()}>
          <Bell className="h-4 w-4" /> Remind unpaid
        </Button>
        <Button variant="secondary" size="sm" loading={generate.isPending} onClick={() => generate.mutate()}>
          Generate bills
        </Button>
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
    invalidate: [['invoices'], ['dashboard']],
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
            <span className="text-sm font-medium text-ink">Line items</span>
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
                  <button onClick={() => remove(idx)} className="text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tax amount"><Input type="number" step="0.01" {...register('taxAmount')} /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm text-muted">
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
  const [editingPay, setEditingPay] = useState<Pay | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const issue = useApiMutation((_v: void) => post(`/billing/invoices/${id}/issue`), { invalidate: [['invoices'], ['dashboard']], successMessage: 'Invoice issued' });
  const removePayment = useApiMutation((pid: string) => del(`/billing/payments/${pid}`), { invalidate: [['invoices'], ['dashboard']], successMessage: 'Payment removed' });
  const [showEdit, setShowEdit] = useState(false);

  const outstanding = data ? Number(data.totalAmount) - Number(data.amountPaid) : 0;

  return (
    <Modal open onClose={onClose} title={data ? `Invoice ${data.invoiceNumber}` : 'Invoice'}>
      {!data ? null : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge tone={statusTone(data.status)}>{data.status.replace(/_/g, ' ')}</Badge>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">Due {data.dueDate.slice(0, 10)}</span>
              {data.status !== 'PAID' && data.status !== 'CANCELLED' && (
                <button onClick={() => setShowEdit(true)} className="inline-flex items-center gap-1 text-sm text-green hover:underline">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </div>
          </div>

          {/* Resident the invoice is for */}
          {data.unit?.residencies?.[0]?.user && (
            <div className="rounded-lg bg-surface2 p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-faint">Resident</p>
              <p className="font-medium text-ink">{data.unit.residencies[0].user.fullName}</p>
              <p className="text-muted">{data.unit.residencies[0].user.phone ?? '—'} · {data.unit.residencies[0].user.email}</p>
              <p className="text-xs text-faint">Unit {data.unit.unitNumber}</p>
            </div>
          )}
          <table className="w-full text-sm">
            <tbody>
              {data.lineItems?.map((li) => (
                <tr key={li.id} className="border-b border-line">
                  <td className="py-2">{li.description}</td>
                  <td className="py-2 text-right text-muted">{li.quantity} × {money(li.unitPrice)}</td>
                  <td className="py-2 text-right font-medium">{money(li.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-line pt-2 text-sm">
            {(Number(data.taxAmount ?? 0) > 0 || Number(data.lateFee ?? 0) > 0) && (
              <div className="space-y-0.5 text-muted">
                {Number(data.taxAmount ?? 0) > 0 && (
                  <div className="flex justify-between"><span>Tax</span><span>{money(data.taxAmount!)}</span></div>
                )}
                {Number(data.lateFee ?? 0) > 0 && (
                  <div className="flex justify-between"><span>Late-payment penalty</span><span className="text-danger">{money(data.lateFee!)}</span></div>
                )}
              </div>
            )}
            <div className="mt-1 flex justify-between">
              <span className="font-medium text-ink">Total</span>
              <span className="font-semibold text-ink">{money(data.totalAmount)} <span className="text-faint">(paid {money(data.amountPaid)})</span></span>
            </div>
          </div>

          {(data.payments ?? []).length > 0 && (
            <div className="border-t border-line pt-3">
              <p className="mb-1 text-xs font-semibold uppercase text-faint">Recorded payments</p>
              {data.payments?.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted">{money(p.amount)} · {p.method} · {p.status}</span>
                  {p.gatewayProvider === 'manual' && p.status === 'SUCCESS' && (
                    <div className="flex gap-1">
                      <button onClick={() => setEditingPay(p)} className="text-faint hover:text-green" title="Edit this payment">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm('Reverse this payment?')) removePayment.mutateAsync(p.id).then(() => refetch()); }}
                        className="text-faint hover:text-danger"
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

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {data.status === 'DRAFT' && (
              <Button size="sm" loading={issue.isPending} onClick={() => issue.mutateAsync().then(() => refetch())}>Issue invoice</Button>
            )}
            {['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(data.status) && (
              <Button size="sm" onClick={() => setRecordOpen(true)}>Record payment</Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => savePdf(`/billing/invoices/${data.id}/pdf`, `${data.invoiceNumber}-bill.pdf`)}>
              <Download className="h-4 w-4" /> Bill
            </Button>
            {Number(data.amountPaid) > 0 && (
              <Button variant="secondary" size="sm" onClick={() => savePdf(`/billing/invoices/${data.id}/receipt`, `${data.invoiceNumber}-receipt.pdf`)}>
                <Download className="h-4 w-4" /> Receipt
              </Button>
            )}
          </div>
        </div>
      )}
      {recordOpen && data && (
        <RecordPayment invoiceId={data.id} outstanding={outstanding} onClose={() => { setRecordOpen(false); refetch(); }} />
      )}
      {editingPay && <PaymentEdit payment={editingPay} onClose={() => { setEditingPay(null); refetch(); }} />}
      {showEdit && data && <EditInvoice invoice={data} onClose={() => { setShowEdit(false); refetch(); }} />}
    </Modal>
  );
}

const PAY_METHODS: { value: string; label: string }[] = [
  { value: 'UPI', label: 'UPI' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
];

/** Record an offline payment with date, mode and reference (prototype parity). */
function RecordPayment({ invoiceId, outstanding, onClose }: { invoiceId: string; outstanding: number; onClose: () => void }) {
  const [amount, setAmount] = useState(String(outstanding > 0 ? outstanding : ''));
  const [method, setMethod] = useState('UPI');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const record = useApiMutation(
    (v: { invoiceId: string; amount: number; method: string; paidAt: string; reference?: string }) =>
      post('/billing/payments/manual', v),
    { invalidate: [['invoices'], ['dashboard']], successMessage: 'Payment recorded' },
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Record payment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={record.isPending}
            onClick={async () => {
              await record.mutateAsync({
                invoiceId,
                amount: Number(amount),
                method,
                paidAt,
                reference: reference || undefined,
              });
              onClose();
            }}
          >
            Confirm payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-faint">Outstanding: {money(outstanding)}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)"><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Payment date"><Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></Field>
        </div>
        <Field label="Mode">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </Field>
        <Field label="Reference / txn no. (optional)">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque no." />
        </Field>
      </div>
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
    { invalidate: [['invoices'], ['dashboard']], successMessage: 'Invoice updated' },
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
            <span className="text-sm font-medium text-ink">Line items</span>
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
                  <button onClick={() => remove(idx)} className="text-faint hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tax amount (₹)"><Input type="number" step="0.01" {...register('taxAmount')} /></Field>
          <Field label="Late-payment penalty (₹)"><Input type="number" step="0.01" {...register('lateFee')} /></Field>
        </div>
        <p className="text-xs text-muted">Subtotal and total are recomputed automatically (subtotal + tax + late fee). PAID and CANCELLED invoices can't be edited.</p>
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
    { invalidate: [['invoices'], ['dashboard']], successMessage: 'Payment updated' },
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
        <Field label="Mode">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </Field>
        <Field label="Reference (cheque/UTR no., optional)">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / cheque #" />
        </Field>
        <p className="text-xs text-muted">Editing this payment will recompute the invoice's paid amount and status.</p>
      </div>
    </Modal>
  );
}
