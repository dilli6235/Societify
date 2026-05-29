import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge, statusTone } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useList, useApiMutation } from '@/lib/hooks';
import { post, patch, del } from '@/lib/apiClient';
import type { Block, Unit } from '@/lib/types';
import { ResidentsTab } from './ResidentsTab';

type Tab = 'units' | 'blocks' | 'residents';

export function PropertiesPage() {
  const [tab, setTab] = useState<Tab>('units');
  return (
    <div>
      <PageHeader title="Properties" subtitle="Blocks, units, owners & tenants" />
      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {(['units', 'blocks', 'residents'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium capitalize',
              tab === t ? 'bg-brand-600 text-white' : 'text-slate-600',
            )}
          >
            {t === 'residents' ? 'Owners & Tenants' : t}
          </button>
        ))}
      </div>
      {tab === 'units' ? <UnitsTab /> : tab === 'blocks' ? <BlocksTab /> : <ResidentsTab />}
    </div>
  );
}

// ── Blocks ──────────────────────────────────────────────────────────────
function BlocksTab() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Block | null>(null);
  const { data, isLoading } = useList<Block>(['blocks'], '/properties/blocks');
  const remove = useApiMutation((id: string) => del(`/properties/blocks/${id}`), {
    invalidate: [['blocks']],
    successMessage: 'Block deleted',
  });

  const columns: Column<Block>[] = [
    { header: 'Name', cell: (b) => <span className="font-medium text-slate-800">{b.name}</span> },
    { header: 'Floors', cell: (b) => b.totalFloors ?? '—' },
    { header: 'Units', cell: (b) => b._count?.units ?? 0 },
    {
      header: '',
      cell: (b) => (
        <div className="flex gap-1">
          <button onClick={() => setEditing(b)} className="text-slate-400 hover:text-brand-600" title="Edit block">
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => { if (confirm(`Delete block "${b.name}"? This fails if it has units.`)) remove.mutate(b.id); }}
            className="text-slate-400 hover:text-red-500"
            title="Delete block"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add block
        </Button>
      </div>
      <Table columns={columns} rows={data?.items ?? []} rowKey={(b) => b.id} loading={isLoading} empty="No blocks yet" />
      {open && <BlockForm onClose={() => setOpen(false)} />}
      {editing && <BlockForm existing={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function BlockForm({ existing, onClose }: { existing?: Block; onClose: () => void }) {
  const isEdit = Boolean(existing);
  const { register, handleSubmit } = useForm<{ name: string; totalFloors?: number }>({
    defaultValues: existing ? { name: existing.name, totalFloors: existing.totalFloors ?? undefined } : {},
  });
  const save = useApiMutation(
    (v: { name: string; totalFloors?: number }) => {
      const body = { ...v, totalFloors: v.totalFloors ? Number(v.totalFloors) : undefined };
      return isEdit ? patch(`/properties/blocks/${existing!.id}`, body) : post('/properties/blocks', body);
    },
    { invalidate: [['blocks']], successMessage: isEdit ? 'Block updated' : 'Block created' },
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit ${existing?.name}` : 'Add block'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} onClick={handleSubmit(async (v) => { await save.mutateAsync(v); onClose(); })}>{isEdit ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Block name"><Input placeholder="Tower A" {...register('name', { required: true })} /></Field>
        <Field label="Total floors"><Input type="number" {...register('totalFloors')} /></Field>
      </div>
    </Modal>
  );
}

// ── Units ───────────────────────────────────────────────────────────────
function UnitsTab() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const units = useList<Unit>(['units'], '/properties/units');
  const remove = useApiMutation((id: string) => del(`/properties/units/${id}`), {
    invalidate: [['units']],
    successMessage: 'Unit deleted',
  });

  const columns: Column<Unit>[] = [
    { header: 'Unit', cell: (u) => <span className="font-medium text-slate-800">{u.unitNumber}</span> },
    { header: 'Block', cell: (u) => u.block?.name ?? '—' },
    { header: 'Floor', cell: (u) => u.floor ?? '—' },
    { header: 'Type', cell: (u) => u.type },
    { header: 'Occupancy', cell: (u) => <Badge tone={statusTone(u.occupancyStatus)}>{u.occupancyStatus.replace(/_/g, ' ')}</Badge> },
    {
      header: 'Residents',
      cell: (u) => {
        const active = u.residencies ?? [];
        if (active.length === 0) return <span className="text-slate-400">—</span>;
        return (
          <div className="space-y-1">
            {active.map((r) => (
              <div key={r.id} className="text-xs">
                <div className="font-medium text-slate-700">
                  {r.user.fullName} <span className="text-slate-400">· {r.role}{r.isPrimary ? ' ★' : ''}</span>
                </div>
                <div className="text-slate-500">{r.user.phone ?? '—'} · {r.user.email}</div>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      header: '',
      cell: (u) => (
        <div className="flex gap-1">
          <button onClick={() => setEditing(u)} className="text-slate-400 hover:text-brand-600" title="Edit unit">
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => { if (confirm(`Delete unit "${u.unitNumber}"?`)) remove.mutate(u.id); }}
            className="text-slate-400 hover:text-red-500"
            title="Delete unit"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add unit
        </Button>
      </div>
      <Table columns={columns} rows={units.data?.items ?? []} rowKey={(u) => u.id} loading={units.isLoading} empty="No units yet" />
      {open && <UnitForm onClose={() => setOpen(false)} />}
      {editing && <UnitForm existing={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function UnitForm({ existing, onClose }: { existing?: Unit; onClose: () => void }) {
  const isEdit = Boolean(existing);
  const blocks = useList<Block>(['blocks'], '/properties/blocks');
  const { register, handleSubmit } = useForm<{
    blockId: string; unitNumber: string; floor?: number; type: string; occupancyStatus: string;
  }>({
    defaultValues: existing
      ? {
          blockId: existing.block?.id ?? '',
          unitNumber: existing.unitNumber,
          floor: existing.floor ?? undefined,
          type: existing.type,
          occupancyStatus: existing.occupancyStatus,
        }
      : { type: 'APARTMENT', occupancyStatus: 'VACANT' },
  });
  const save = useApiMutation(
    (v: { blockId: string; unitNumber: string; floor?: number; type: string; occupancyStatus: string }) => {
      const body = { ...v, floor: v.floor ? Number(v.floor) : undefined };
      return isEdit ? patch(`/properties/units/${existing!.id}`, body) : post('/properties/units', body);
    },
    { invalidate: [['units']], successMessage: isEdit ? 'Unit updated' : 'Unit created' },
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Edit ${existing?.unitNumber}` : 'Add unit'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} onClick={handleSubmit(async (v) => { await save.mutateAsync(v); onClose(); })}>{isEdit ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Block">
          <Select {...register('blockId', { required: true })}>
            <option value="">Select a block…</option>
            {blocks.data?.items.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </Field>
        <Field label="Unit number"><Input placeholder="A-101" {...register('unitNumber', { required: true })} /></Field>
        <Field label="Floor"><Input type="number" {...register('floor')} /></Field>
        <Field label="Type">
          <Select {...register('type')}>
            {['APARTMENT', 'VILLA', 'SHOP', 'OFFICE', 'PARKING'].map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Occupancy">
          <Select {...register('occupancyStatus')}>
            {['VACANT', 'OWNER_OCCUPIED', 'RENTED'].map((t) => <option key={t}>{t}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
