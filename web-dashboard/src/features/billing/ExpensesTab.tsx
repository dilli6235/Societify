import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useList, useApiMutation } from '@/lib/hooks';
import { getOne, post, patch, del } from '@/lib/apiClient';

interface Expense {
  id: string;
  category: string;
  title: string;
  description: string | null;
  amount: string;
  vendorName: string | null;
  expenseDate: string;
  receiptUrl: string | null;
  createdAt: string;
}

interface Summary {
  byCategory: { category: string; total: number; count: number }[];
  grandTotal: number;
}

const CATEGORIES = ['HOUSEKEEPING', 'SECURITY', 'MAINTENANCE', 'UTILITIES', 'REPAIRS', 'SALARIES', 'EVENTS', 'OTHER'];

const CATEGORY_LABEL: Record<string, string> = {
  UTILITIES: 'Utilities (EB / water)',
  MAINTENANCE: 'Maintenance',
  HOUSEKEEPING: 'Housekeeping',
  SECURITY: 'Security',
  REPAIRS: 'Repairs',
  SALARIES: 'Salaries',
  EVENTS: 'Events',
  OTHER: 'Other',
};

const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export function ExpensesTab() {
  const [filter, setFilter] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const params = filter ? { category: filter, pageSize: 200 } : { pageSize: 200 };
  const expenses = useList<Expense>(['expenses', filter], '/billing/expenses', params);
  const summary = useQuery({ queryKey: ['expenses-summary'], queryFn: () => getOne<Summary>('/billing/expenses/summary') });
  const remove = useApiMutation((id: string) => del(`/billing/expenses/${id}`), {
    invalidate: [['expenses'], ['expenses-summary']],
    successMessage: 'Expense deleted',
  });

  const columns: Column<Expense>[] = [
    { header: 'Date', cell: (e) => e.expenseDate.slice(0, 10) },
    { header: 'Category', cell: (e) => <Badge tone="blue">{e.category.replace(/_/g, ' ')}</Badge> },
    { header: 'Title', cell: (e) => <span className="font-medium text-slate-800">{e.title}</span> },
    { header: 'Vendor', cell: (e) => e.vendorName ?? '—' },
    { header: 'Amount', cell: (e) => <span className="font-semibold">{money(e.amount)}</span> },
    {
      header: '',
      cell: (e) => (
        <div className="flex gap-1">
          <button onClick={() => setEditing(e)} className="text-slate-400 hover:text-brand-600" title="Edit expense">
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => { if (confirm(`Delete expense "${e.title}"?`)) remove.mutate(e.id); }}
            className="text-slate-400 hover:text-red-500"
            title="Delete expense"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Summary cards */}
      {summary.data && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="card p-4">
            <p className="text-xs uppercase text-slate-500">Total spend</p>
            <p className="text-xl font-semibold text-slate-900">{money(summary.data.grandTotal)}</p>
          </div>
          {summary.data.byCategory.slice(0, 3).map((c) => (
            <div key={c.category} className="card p-4">
              <p className="text-xs uppercase text-slate-500">{CATEGORY_LABEL[c.category] ?? c.category}</p>
              <p className="text-xl font-semibold text-slate-900">{money(c.total)}</p>
              <p className="text-xs text-slate-400">{c.count} entr{c.count === 1 ? 'y' : 'ies'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter + add */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-[240px]">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
        </Select>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add expense</Button>
      </div>

      <Table
        columns={columns}
        rows={expenses.data?.items ?? []}
        rowKey={(e) => e.id}
        loading={expenses.isLoading}
        empty="No expenses recorded"
      />

      {open && <ExpenseForm onClose={() => setOpen(false)} />}
      {editing && <ExpenseForm existing={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

interface FormVals {
  category: string;
  title: string;
  description?: string;
  amount: number;
  vendorName?: string;
  expenseDate: string;
  receiptUrl?: string;
}

function ExpenseForm({ existing, onClose }: { existing?: Expense; onClose: () => void }) {
  const isEdit = Boolean(existing);
  const { register, handleSubmit } = useForm<FormVals>({
    defaultValues: existing
      ? {
          category: existing.category,
          title: existing.title,
          description: existing.description ?? undefined,
          amount: Number(existing.amount),
          vendorName: existing.vendorName ?? undefined,
          expenseDate: existing.expenseDate.slice(0, 10),
          receiptUrl: existing.receiptUrl ?? undefined,
        }
      : { category: 'UTILITIES', expenseDate: new Date().toISOString().slice(0, 10) },
  });
  const save = useApiMutation(
    (v: FormVals) => {
      const body = { ...v, amount: Number(v.amount) };
      return isEdit ? patch(`/billing/expenses/${existing!.id}`, body) : post('/billing/expenses', body);
    },
    { invalidate: [['expenses'], ['expenses-summary']], successMessage: isEdit ? 'Expense updated' : 'Expense recorded' },
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit — ${existing?.title}` : 'Record an expense'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} onClick={handleSubmit(async (v) => { await save.mutateAsync(v); onClose(); })}>{isEdit ? 'Save' : 'Add'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Category">
          <Select {...register('category', { required: true })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
          </Select>
        </Field>
        <Field label="Title"><Input placeholder="e.g. EB bill May 2026" {...register('title', { required: true })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)"><Input type="number" step="0.01" {...register('amount', { required: true })} /></Field>
          <Field label="Date"><Input type="date" {...register('expenseDate', { required: true })} /></Field>
        </div>
        <Field label="Vendor / paid to"><Input placeholder="TNEB / vendor name" {...register('vendorName')} /></Field>
        <Field label="Receipt URL (optional)"><Input placeholder="https://…" {...register('receiptUrl')} /></Field>
        <Field label="Notes"><Textarea {...register('description')} /></Field>
      </div>
    </Modal>
  );
}
