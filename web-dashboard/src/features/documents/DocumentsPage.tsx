import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, FileText, ExternalLink, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useHasRole } from '@/features/auth/guards';
import { useList, useApiMutation } from '@/lib/hooks';
import { post, del } from '@/lib/apiClient';

interface Doc { id: string; title: string; category: string; description: string | null; fileUrl: string; visibility: string }

export function DocumentsPage() {
  const [open, setOpen] = useState(false);
  const canManage = useHasRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER');
  const docs = useList<Doc>(['documents'], '/documents');
  const { register, handleSubmit, reset } = useForm<{ title: string; category: string; fileUrl: string; description?: string; visibility: string }>();
  const create = useApiMutation((v: object) => post('/documents', v), { invalidate: [['documents']], successMessage: 'Document added' });
  const remove = useApiMutation((id: string) => del(`/documents/${id}`), { invalidate: [['documents']], successMessage: 'Removed' });

  return (
    <div>
      <PageHeader
        title="Document Vault"
        subtitle="Bylaws, minutes, agreements and more"
        action={canManage && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add document</Button>}
      />
      {docs.isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docs.data?.items.map((d) => (
            <div key={d.id} className="card flex flex-col p-5">
              <div className="mb-2 flex items-start justify-between">
                <FileText className="h-6 w-6 text-brand-600" />
                <Badge tone="gray">{d.visibility.replace(/_/g, ' ')}</Badge>
              </div>
              <h3 className="font-semibold text-slate-800">{d.title}</h3>
              <p className="text-xs text-slate-400">{d.category}</p>
              {d.description && <p className="mt-1 flex-1 text-sm text-slate-500">{d.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {canManage && <button onClick={() => remove.mutate(d.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>
          ))}
          {docs.data?.items.length === 0 && <p className="text-sm text-slate-400">No documents yet</p>}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add document"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button loading={create.isPending} onClick={handleSubmit(async (v) => { await create.mutateAsync(v); reset(); setOpen(false); })}>Add</Button></>}
      >
        <div className="space-y-4">
          <Field label="Title"><Input {...register('title', { required: true })} /></Field>
          <Field label="Category"><Input placeholder="Bylaws, Minutes…" {...register('category', { required: true })} /></Field>
          <Field label="File URL"><Input placeholder="https://…" {...register('fileUrl', { required: true })} /></Field>
          <Field label="Visibility">
            <Select {...register('visibility')} defaultValue="ALL_RESIDENTS">
              <option value="ALL_RESIDENTS">All residents</option>
              <option value="COMMITTEE">Committee only</option>
              <option value="ADMIN_ONLY">Admin only</option>
            </Select>
          </Field>
          <Field label="Description"><Textarea {...register('description')} /></Field>
        </div>
      </Modal>
    </div>
  );
}
