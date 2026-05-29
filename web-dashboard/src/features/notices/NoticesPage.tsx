import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pin, Eye, Paperclip, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useHasRole } from '@/features/auth/guards';
import { useList, useApiMutation } from '@/lib/hooks';
import { post, getOne } from '@/lib/apiClient';
import type { Notice, NoticeReader } from '@/lib/types';

const CATEGORIES = ['General', 'Maintenance', 'Security', 'Events', 'Water', 'Power', 'AGM', 'Lost & Found'];
const AUDIENCES: { value: Notice['audience']; label: string }[] = [
  { value: 'ALL', label: 'Everyone' },
  { value: 'OWNERS', label: 'Owners only' },
  { value: 'TENANTS', label: 'Tenants only' },
];
const isImage = (url: string) => /\.(png|jpe?g|gif|webp|avif)$/i.test(url);

export function NoticesPage() {
  const [open, setOpen] = useState(false);
  const [seenFor, setSeenFor] = useState<Notice | null>(null);
  const canPost = useHasRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER');
  const { data, isLoading } = useList<Notice>(['notices'], '/notices');

  // Residents: mark the board read on view (read-receipt for the committee).
  const markAll = useApiMutation((_v: void) => post('/notices/read-all'), { invalidate: [['notices']] });
  useEffect(() => {
    if (!canPost) markAll.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPost]);

  return (
    <div>
      <PageHeader
        title="Notice board"
        subtitle="Announcements for your community"
        action={canPost && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Post notice</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (data?.items.length ?? 0) === 0 ? (
        <p className="text-sm text-faint">No notices yet</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.items.map((n) => {
            const expired = n.expiresAt && new Date(n.expiresAt) < new Date();
            return (
              <div key={n.id} className="card p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {n.isPinned && <Pin className="h-4 w-4 text-green" />}
                    <h3 className="font-display font-semibold text-ink">{n.title}</h3>
                  </div>
                  <Badge tone={statusTone(n.priority)}>{n.priority}</Badge>
                </div>

                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {n.category && <Badge tone="gray">{n.category}</Badge>}
                  {canPost && n.audience !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-faint"><Users className="h-3 w-3" />{n.audience === 'OWNERS' ? 'Owners' : 'Tenants'}</span>
                  )}
                  {expired && <Badge tone="red">Expired</Badge>}
                </div>

                <p className="whitespace-pre-line text-sm text-muted">{n.body}</p>

                {n.attachments?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {n.attachments.map((url, i) =>
                      isImage(url) ? (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="attachment" className="h-20 w-20 rounded-lg border border-line object-cover" />
                        </a>
                      ) : (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-line2 px-2.5 py-1 text-xs text-green hover:bg-surface2">
                          <Paperclip className="h-3 w-3" /> Attachment {i + 1}
                        </a>
                      ),
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-faint">{new Date(n.publishedAt).toLocaleString()}</p>
                  {canPost && (
                    <button onClick={() => setSeenFor(n)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
                      <Eye className="h-3.5 w-3.5" /> Seen by {n._count?.reads ?? 0}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && <NoticeForm onClose={() => setOpen(false)} />}
      {seenFor && <SeenByModal notice={seenFor} onClose={() => setSeenFor(null)} />}
    </div>
  );
}

interface FormVals {
  title: string;
  body: string;
  priority: string;
  audience: string;
  category: string;
  attachments: string;
  expiresAt: string;
  isPinned: boolean;
}

function NoticeForm({ onClose }: { onClose: () => void }) {
  const { register, handleSubmit, reset } = useForm<FormVals>({ defaultValues: { priority: 'INFO', audience: 'ALL', category: 'General' } });
  const create = useApiMutation(
    (v: FormVals) =>
      post('/notices', {
        title: v.title,
        body: v.body,
        priority: v.priority,
        audience: v.audience,
        category: v.category || null,
        attachments: v.attachments.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
        expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : null,
        isPinned: v.isPinned,
      }),
    { invalidate: [['notices']], successMessage: 'Notice posted' },
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Post a notice"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={create.isPending} onClick={handleSubmit(async (v) => { await create.mutateAsync(v); reset(); onClose(); })}>Publish</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title"><Input {...register('title', { required: true })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <Select {...register('priority')}>{['INFO', 'IMPORTANT', 'EMERGENCY'].map((p) => <option key={p}>{p}</option>)}</Select>
          </Field>
          <Field label="Audience">
            <Select {...register('audience')}>{AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</Select>
          </Field>
          <Field label="Category">
            <Select {...register('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
          </Field>
          <Field label="Expires on (optional)"><Input type="date" {...register('expiresAt')} /></Field>
        </div>
        <Field label="Message"><Textarea {...register('body', { required: true })} /></Field>
        <Field label="Attachment URLs (one per line — images preview inline)">
          <Textarea placeholder={'https://…/circular.pdf\nhttps://…/poster.jpg'} {...register('attachments')} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" {...register('isPinned')} /> Pin to top</label>
      </div>
    </Modal>
  );
}

function SeenByModal({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['notice-reads', notice.id], queryFn: () => getOne<NoticeReader[]>(`/notices/${notice.id}/reads`) });
  return (
    <Modal open onClose={onClose} title={`Seen by — ${notice.title}`}>
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (data?.length ?? 0) === 0 ? (
        <p className="py-6 text-center text-sm text-faint">No one has seen this yet.</p>
      ) : (
        <div className="-my-1">
          {data?.map((r) => (
            <div key={r.userId} className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0">
              <span className="text-ink">{r.fullName}</span>
              <span className="text-faint">{new Date(r.readAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
