import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useHasRole } from '@/features/auth/guards';
import { useList, useApiMutation } from '@/lib/hooks';
import { post } from '@/lib/apiClient';
import type { Poll } from '@/lib/types';

export function PollsPage() {
  const [open, setOpen] = useState(false);
  const canManage = useHasRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER');
  const { data, isLoading } = useList<Poll>(['polls'], '/polls');
  const vote = useApiMutation(
    ({ pollId, optionId }: { pollId: string; optionId: string }) => post(`/polls/${pollId}/vote`, { optionIds: [optionId] }),
    { invalidate: [['polls']], successMessage: 'Vote recorded' },
  );

  return (
    <div>
      <PageHeader
        title="Polls"
        subtitle="Gather community opinion"
        action={canManage && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New poll</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.items.map((p) => {
            const total = p.totalVotes ?? p.options.reduce((s, o) => s + (o.votes ?? 0), 0);
            return (
              <div key={p.id} className="card p-5">
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="font-semibold text-slate-800">{p.question}</h3>
                  {p.isClosed && <Badge tone="gray">closed</Badge>}
                </div>
                <div className="space-y-2">
                  {p.options.map((o) => {
                    const pct = total ? Math.round(((o.votes ?? 0) / total) * 100) : 0;
                    return (
                      <button
                        key={o.id}
                        disabled={p.isClosed}
                        onClick={() => vote.mutate({ pollId: p.id, optionId: o.id })}
                        className="relative block w-full overflow-hidden rounded-lg border border-slate-200 p-2 text-left text-sm disabled:cursor-default"
                      >
                        <div className="absolute inset-0 bg-brand-50" style={{ width: `${pct}%` }} />
                        <div className="relative flex justify-between">
                          <span className="text-slate-700">{o.text}</span>
                          <span className="text-slate-500">{pct}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-400">{total} vote{total === 1 ? '' : 's'}</p>
              </div>
            );
          })}
          {data?.items.length === 0 && <p className="text-sm text-slate-400">No polls yet</p>}
        </div>
      )}

      {open && <CreatePoll onClose={() => setOpen(false)} />}
    </div>
  );
}

function CreatePoll({ onClose }: { onClose: () => void }) {
  const { register, control, handleSubmit } = useForm<{ question: string; options: { text: string }[] }>({
    defaultValues: { options: [{ text: '' }, { text: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'options' });
  const create = useApiMutation(
    (v: { question: string; options: { text: string }[] }) => post('/polls', { question: v.question, options: v.options.map((o) => o.text) }),
    { invalidate: [['polls']], successMessage: 'Poll created' },
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="New poll"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={create.isPending} onClick={handleSubmit(async (v) => { await create.mutateAsync(v); onClose(); })}>Create</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Question"><Input {...register('question', { required: true })} /></Field>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Options</span>
            <Button size="sm" variant="ghost" onClick={() => append({ text: '' })}><Plus className="h-4 w-4" /> Add</Button>
          </div>
          <div className="space-y-2">
            {fields.map((f, idx) => (
              <div key={f.id} className="flex items-center gap-2">
                <Input className="flex-1" placeholder={`Option ${idx + 1}`} {...register(`options.${idx}.text`, { required: true })} />
                {fields.length > 2 && <button onClick={() => remove(idx)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
