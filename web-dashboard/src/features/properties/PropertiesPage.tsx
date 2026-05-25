import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge, statusTone } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useList, useApiMutation } from '@/lib/hooks';
import { post } from '@/lib/apiClient';
import type { Block, Unit } from '@/lib/types';

type Tab = 'units' | 'blocks';

export function PropertiesPage() {
  const [tab, setTab] = useState<Tab>('units');
  return (
    <div>
      <PageHeader title="Properties" subtitle="Blocks and units in your community" />
      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {(['units', 'blocks'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium capitalize',
              tab === t ? 'bg-brand-600 text-white' : 'text-slate-600',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'units' ? <UnitsTab /> : <BlocksTab />}
    </div>
  );
}

// ── Blocks ──────────────────────────────────────────────────────────────
function BlocksTab() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useList<Block>(['blocks'], '/properties/blocks');
  const { register, handleSubmit, reset } = useForm<{ name: string; totalFloors?: number }>();
  const create = useApiMutation(
    (v: { name: string; totalFloors?: number }) => post('/properties/blocks', v),
    { invalidate: [['blocks']], successMessage: 'Block created' },
  );

  const columns: Column<Block>[] = [
    { header: 'Name', cell: (b) => <span className="font-medium text-slate-800">{b.name}</span> },
    { header: 'Floors', cell: (b) => b.totalFloors ?? '—' },
    { header: 'Units', cell: (b) => b._count?.units ?? 0 },
  ];

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add block
        </Button>
      </div>
      <Table columns={columns} rows={data?.items ?? []} rowKey={(b) => b.id} loading={isLoading} empty="No blocks yet" />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add block"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              loading={create.isPending}
              onClick={handleSubmit(async (v) => {
                await create.mutateAsync({ ...v, totalFloors: v.totalFloors ? Number(v.totalFloors) : undefined });
                reset();
                setOpen(false);
              })}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Block name"><Input placeholder="Tower A" {...register('name', { required: true })} /></Field>
          <Field label="Total floors"><Input type="number" {...register('totalFloors')} /></Field>
        </div>
      </Modal>
    </>
  );
}

// ── Units ───────────────────────────────────────────────────────────────
function UnitsTab() {
  const [open, setOpen] = useState(false);
  const units = useList<Unit>(['units'], '/properties/units');
  const blocks = useList<Block>(['blocks'], '/properties/blocks');
  const { register, handleSubmit, reset } = useForm<{
    blockId: string; unitNumber: string; floor?: number; type: string; occupancyStatus: string;
  }>();
  const create = useApiMutation((v: object) => post('/properties/units', v), {
    invalidate: [['units']],
    successMessage: 'Unit created',
  });

  const columns: Column<Unit>[] = [
    { header: 'Unit', cell: (u) => <span className="font-medium text-slate-800">{u.unitNumber}</span> },
    { header: 'Block', cell: (u) => u.block?.name ?? '—' },
    { header: 'Floor', cell: (u) => u.floor ?? '—' },
    { header: 'Type', cell: (u) => u.type },
    { header: 'Occupancy', cell: (u) => <Badge tone={statusTone(u.occupancyStatus)}>{u.occupancyStatus.replace(/_/g, ' ')}</Badge> },
  ];

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add unit
        </Button>
      </div>
      <Table columns={columns} rows={units.data?.items ?? []} rowKey={(u) => u.id} loading={units.isLoading} empty="No units yet" />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add unit"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              loading={create.isPending}
              onClick={handleSubmit(async (v) => {
                await create.mutateAsync({ ...v, floor: v.floor ? Number(v.floor) : undefined });
                reset();
                setOpen(false);
              })}
            >
              Create
            </Button>
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
            <Select {...register('type')} defaultValue="APARTMENT">
              {['APARTMENT', 'VILLA', 'SHOP', 'OFFICE', 'PARKING'].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Occupancy">
            <Select {...register('occupancyStatus')} defaultValue="VACANT">
              {['VACANT', 'OWNER_OCCUPIED', 'RENTED'].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>
    </>
  );
}
