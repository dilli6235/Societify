import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useHasRole } from '@/features/auth/guards';
import { useList, useApiMutation } from '@/lib/hooks';
import { post, del } from '@/lib/apiClient';

interface Vehicle {
  id: string;
  type: string;
  registrationNumber: string;
  make: string | null;
  model: string | null;
  parkingSlot: string | null;
  unit?: { id: string; unitNumber: string };
}
interface Unit { id: string; unitNumber: string }

export function VehiclesPage() {
  const [open, setOpen] = useState(false);
  const canManage = useHasRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN', 'SECURITY_GUARD');
  const vehicles = useList<Vehicle>(['vehicles'], '/vehicles');
  const units = useList<Unit>(['units'], '/properties/units');
  const { register, handleSubmit, reset } = useForm<{ unitId: string; type: string; registrationNumber: string; make?: string; parkingSlot?: string }>();

  const create = useApiMutation((v: object) => post('/vehicles', v), { invalidate: [['vehicles']], successMessage: 'Vehicle added' });
  const remove = useApiMutation((id: string) => del(`/vehicles/${id}`), { invalidate: [['vehicles']], successMessage: 'Vehicle removed' });

  const columns: Column<Vehicle>[] = [
    { header: 'Reg. number', cell: (v) => <span className="font-medium text-slate-800">{v.registrationNumber}</span> },
    { header: 'Type', cell: (v) => <Badge tone="blue">{v.type}</Badge> },
    { header: 'Make/Model', cell: (v) => [v.make, v.model].filter(Boolean).join(' ') || '—' },
    { header: 'Unit', cell: (v) => v.unit?.unitNumber ?? '—' },
    { header: 'Parking', cell: (v) => v.parkingSlot ?? '—' },
    ...(canManage
      ? [{ header: '', cell: (v: Vehicle) => <button onClick={() => remove.mutate(v.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button> }]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Vehicles & Parking"
        subtitle="Registered vehicles and parking slots"
        action={canManage && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add vehicle</Button>}
      />
      <Table columns={columns} rows={vehicles.data?.items ?? []} rowKey={(v) => v.id} loading={vehicles.isLoading} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add vehicle"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={create.isPending} onClick={handleSubmit(async (v) => { await create.mutateAsync(v); reset(); setOpen(false); })}>Add</Button>
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
          <Field label="Registration number"><Input placeholder="KA01AB1234" {...register('registrationNumber', { required: true })} /></Field>
          <Field label="Type">
            <Select {...register('type')} defaultValue="CAR">{['CAR', 'BIKE', 'SCOOTER', 'BICYCLE', 'OTHER'].map((t) => <option key={t}>{t}</option>)}</Select>
          </Field>
          <Field label="Make / model"><Input placeholder="Honda City" {...register('make')} /></Field>
          <Field label="Parking slot"><Input placeholder="B-12" {...register('parkingSlot')} /></Field>
        </div>
      </Modal>
    </div>
  );
}
