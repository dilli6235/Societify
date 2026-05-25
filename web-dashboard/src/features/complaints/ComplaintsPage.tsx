import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Badge, statusTone } from '@/components/ui/Badge';
import { useHasRole } from '@/features/auth/guards';
import { useList, useApiMutation } from '@/lib/hooks';
import { getOne, post, patch } from '@/lib/apiClient';
import type { Complaint } from '@/lib/types';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'];

interface ComplaintDetail extends Complaint {
  description: string;
  comments: { id: string; body: string; isInternal: boolean; createdAt: string }[];
}

export function ComplaintsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const list = useList<Complaint>(['complaints'], '/complaints');

  const columns: Column<Complaint>[] = [
    { header: 'Ticket', cell: (c) => <span className="font-medium text-slate-800">{c.ticketNumber}</span> },
    { header: 'Title', cell: (c) => c.title },
    { header: 'Category', cell: (c) => c.category },
    { header: 'Priority', cell: (c) => <Badge tone={statusTone(c.priority)}>{c.priority}</Badge> },
    { header: 'Status', cell: (c) => <Badge tone={statusTone(c.status)}>{c.status.replace(/_/g, ' ')}</Badge> },
    { header: 'Assignee', cell: (c) => c.assignedTo?.fullName ?? '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Complaints"
        subtitle="Community tickets"
        action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Raise ticket</Button>}
      />
      <Table columns={columns} rows={list.data?.items ?? []} rowKey={(c) => c.id} loading={list.isLoading} onRowClick={(c) => setDetailId(c.id)} />
      {createOpen && <CreateComplaint onClose={() => setCreateOpen(false)} />}
      {detailId && <ComplaintDetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function CreateComplaint({ onClose }: { onClose: () => void }) {
  const { register, handleSubmit } = useForm<{ title: string; description: string; category: string; priority: string }>();
  const create = useApiMutation((v: object) => post('/complaints', v), { invalidate: [['complaints']], successMessage: 'Ticket raised' });
  return (
    <Modal
      open
      onClose={onClose}
      title="Raise a ticket"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={create.isPending} onClick={handleSubmit(async (v) => { await create.mutateAsync(v); onClose(); })}>Submit</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title"><Input {...register('title', { required: true })} /></Field>
        <Field label="Category"><Input placeholder="Plumbing, Electrical…" {...register('category', { required: true })} /></Field>
        <Field label="Priority">
          <Select {...register('priority')} defaultValue="MEDIUM">{['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p}>{p}</option>)}</Select>
        </Field>
        <Field label="Description"><Textarea {...register('description', { required: true })} /></Field>
      </div>
    </Modal>
  );
}

function ComplaintDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const isStaff = useHasRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN');
  const { data, refetch } = useQuery({ queryKey: ['complaint', id], queryFn: () => getOne<ComplaintDetail>(`/complaints/${id}`) });
  const [comment, setComment] = useState('');

  const setStatus = useApiMutation((status: string) => patch(`/complaints/${id}/status`, { status }), { invalidate: [['complaints']], successMessage: 'Status updated' });
  const addComment = useApiMutation((body: string) => post(`/complaints/${id}/comments`, { body }), { successMessage: 'Comment added' });

  return (
    <Modal open onClose={onClose} title={data ? data.ticketNumber : 'Ticket'}>
      {!data ? null : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">{data.title}</h3>
          <div className="flex gap-2">
            <Badge tone={statusTone(data.priority)}>{data.priority}</Badge>
            <Badge tone={statusTone(data.status)}>{data.status.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="text-sm text-slate-600">{data.description}</p>

          {isStaff && (
            <Field label="Update status">
              <Select
                value={data.status}
                onChange={(e) => setStatus.mutateAsync(e.target.value).then(() => refetch())}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </Select>
            </Field>
          )}

          <div className="border-t border-slate-200 pt-3">
            <p className="mb-2 text-sm font-medium text-slate-700">Comments</p>
            <div className="space-y-2">
              {data.comments.length === 0 && <p className="text-sm text-slate-400">No comments yet</p>}
              {data.comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
                  {c.isInternal && <Badge tone="purple">internal</Badge>} {c.body}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" />
              <Button
                size="sm"
                loading={addComment.isPending}
                onClick={() => addComment.mutateAsync(comment).then(() => { setComment(''); refetch(); })}
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
