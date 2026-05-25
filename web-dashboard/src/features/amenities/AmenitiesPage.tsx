import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, CalendarPlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useHasRole } from '@/features/auth/guards';
import { useList, useApiMutation } from '@/lib/hooks';
import { post } from '@/lib/apiClient';
import type { Amenity } from '@/lib/types';

export function AmenitiesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [bookFor, setBookFor] = useState<Amenity | null>(null);
  const canManage = useHasRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN');
  const { data, isLoading } = useList<Amenity>(['amenities'], '/amenities');

  const { register, handleSubmit, reset } = useForm<{ name: string; description?: string; bookingFee: number }>();
  const create = useApiMutation((v: object) => post('/amenities', v), { invalidate: [['amenities']], successMessage: 'Amenity added' });

  return (
    <div>
      <PageHeader
        title="Amenities"
        subtitle="Facilities and bookings"
        action={canManage && <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add amenity</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {data?.items.map((a) => (
            <div key={a.id} className="card flex flex-col p-5">
              <h3 className="font-semibold text-slate-800">{a.name}</h3>
              <p className="mt-1 flex-1 text-sm text-slate-500">{a.description ?? 'No description'}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-slate-600">Fee ₹{Number(a.bookingFee).toLocaleString('en-IN')}</span>
                <Button size="sm" variant="secondary" onClick={() => setBookFor(a)}><CalendarPlus className="h-4 w-4" /> Book</Button>
              </div>
            </div>
          ))}
          {data?.items.length === 0 && <p className="text-sm text-slate-400">No amenities yet</p>}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add amenity"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={create.isPending} onClick={handleSubmit(async (v) => { await create.mutateAsync({ ...v, bookingFee: Number(v.bookingFee) || 0 }); reset(); setCreateOpen(false); })}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name"><Input placeholder="Clubhouse" {...register('name', { required: true })} /></Field>
          <Field label="Description"><Input {...register('description')} /></Field>
          <Field label="Booking fee (₹)"><Input type="number" defaultValue={0} {...register('bookingFee')} /></Field>
        </div>
      </Modal>

      {bookFor && <BookModal amenity={bookFor} onClose={() => setBookFor(null)} />}
    </div>
  );
}

function BookModal({ amenity, onClose }: { amenity: Amenity; onClose: () => void }) {
  const { register, handleSubmit } = useForm<{ startTime: string; endTime: string; notes?: string }>();
  const book = useApiMutation(
    (v: { startTime: string; endTime: string; notes?: string }) =>
      post('/amenities/bookings', { amenityId: amenity.id, ...v }),
    { invalidate: [['amenities']], successMessage: 'Booking confirmed' },
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={`Book ${amenity.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={book.isPending} onClick={handleSubmit(async (v) => { await book.mutateAsync(v); onClose(); })}>Confirm booking</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Start"><Input type="datetime-local" {...register('startTime', { required: true })} /></Field>
        <Field label="End"><Input type="datetime-local" {...register('endTime', { required: true })} /></Field>
        <Field label="Notes"><Input {...register('notes')} /></Field>
      </div>
    </Modal>
  );
}
