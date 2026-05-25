import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pin } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useHasRole } from '@/features/auth/guards';
import { useList, useApiMutation } from '@/lib/hooks';
import { post } from '@/lib/apiClient';
import type { Notice } from '@/lib/types';

export function NoticesPage() {
  const [open, setOpen] = useState(false);
  const canPost = useHasRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER');
  const { data, isLoading } = useList<Notice>(['notices'], '/notices');
  const { register, handleSubmit, reset } = useForm<{ title: string; body: string; priority: string; isPinned: boolean }>();
  const create = useApiMutation((v: object) => post('/notices', v), { invalidate: [['notices']], successMessage: 'Notice posted' });

  return (
    <div>
      <PageHeader
        title="Notice board"
        subtitle="Announcements for your community"
        action={canPost && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Post notice</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.items.map((n) => (
            <div key={n.id} className="card p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {n.isPinned && <Pin className="h-4 w-4 text-brand-500" />}
                  <h3 className="font-semibold text-slate-800">{n.title}</h3>
                </div>
                <Badge tone={statusTone(n.priority)}>{n.priority}</Badge>
              </div>
              <p className="whitespace-pre-line text-sm text-slate-600">{n.body}</p>
              <p className="mt-3 text-xs text-slate-400">{new Date(n.publishedAt).toLocaleString()}</p>
            </div>
          ))}
          {data?.items.length === 0 && <p className="text-sm text-slate-400">No notices yet</p>}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Post a notice"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={create.isPending} onClick={handleSubmit(async (v) => { await create.mutateAsync(v); reset(); setOpen(false); })}>Publish</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title"><Input {...register('title', { required: true })} /></Field>
          <Field label="Priority">
            <Select {...register('priority')} defaultValue="INFO">{['INFO', 'IMPORTANT', 'EMERGENCY'].map((p) => <option key={p}>{p}</option>)}</Select>
          </Field>
          <Field label="Message"><Textarea {...register('body', { required: true })} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" {...register('isPinned')} /> Pin to top</label>
        </div>
      </Modal>
    </div>
  );
}
