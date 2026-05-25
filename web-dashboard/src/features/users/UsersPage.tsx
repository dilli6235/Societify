import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { UserPlus, Copy, Link2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Field, Input } from '@/components/ui/Input';
import { Badge, statusTone } from '@/components/ui/Badge';
import { toast } from '@/components/ui/toast';
import { useList, useApiMutation } from '@/lib/hooks';
import { post } from '@/lib/apiClient';
import type { SystemRole, UserRow } from '@/lib/types';

const ASSIGNABLE: SystemRole[] = [
  'SOCIETY_ADMIN',
  'COMMITTEE_MEMBER',
  'RESIDENT',
  'SECURITY_GUARD',
  'FACILITY_ADMIN',
  'VENDOR',
];

interface InviteForm {
  email: string;
  fullName: string;
  phone?: string;
  roles: SystemRole[];
}

export function UsersPage() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ acceptUrl: string; emailed: boolean; email: string } | null>(null);
  const users = useList<UserRow>(['users'], '/users');
  const { register, handleSubmit, reset } = useForm<InviteForm>({ defaultValues: { roles: ['RESIDENT'] } });

  const invite = useApiMutation(
    (v: InviteForm) => post<{ inviteToken: string; acceptUrl: string; emailed: boolean }>('/users/invite', v),
    { invalidate: [['users']], successMessage: 'Invitation sent' },
  );

  // Re-issue an activation link for a pending user and copy it to clipboard,
  // so they can be onboarded even if email delivery isn't set up.
  const resend = useApiMutation(
    (id: string) => post<{ inviteToken: string }>(`/users/${id}/resend-invite`),
    {},
  );
  const copyLink = async (id: string) => {
    const res = await resend.mutateAsync(id);
    const link = `${window.location.origin}/accept-invite?token=${res.inviteToken}`;
    await navigator.clipboard.writeText(link);
    toast.success('Activation link copied — share it with the invitee');
  };

  const columns: Column<UserRow>[] = [
    { header: 'Name', cell: (u) => <span className="font-medium text-slate-800">{u.fullName}</span> },
    { header: 'Email', cell: (u) => u.email },
    { header: 'Roles', cell: (u) => <div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} tone="blue">{r.replace(/_/g, ' ')}</Badge>)}</div> },
    { header: 'Status', cell: (u) => <Badge tone={statusTone(u.status)}>{u.status}</Badge> },
    {
      header: '',
      cell: (u) =>
        u.status === 'PENDING' ? (
          <button
            onClick={() => copyLink(u.id)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
            title="Copy activation link"
          >
            <Link2 className="h-3.5 w-3.5" /> Copy activation link
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="People"
        subtitle="Residents, committee, staff and vendors"
        action={<Button onClick={() => setOpen(true)}><UserPlus className="h-4 w-4" /> Invite</Button>}
      />
      <Table columns={columns} rows={users.data?.items ?? []} rowKey={(u) => u.id} loading={users.isLoading} />

      <Modal
        open={open}
        onClose={() => { setOpen(false); setResult(null); }}
        title="Invite a person"
        footer={
          !result && (
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                loading={invite.isPending}
                onClick={handleSubmit(async (v) => {
                  const res = await invite.mutateAsync({ ...v, roles: v.roles.length ? v.roles : ['RESIDENT'] });
                  reset();
                  setResult({ acceptUrl: res.acceptUrl, emailed: res.emailed, email: v.email });
                })}
              >
                Send invite
              </Button>
            </>
          )
        }
      >
        {result ? (
          <div className="space-y-3">
            {result.emailed ? (
              <p className="text-sm text-emerald-700">
                ✅ An invitation email was sent to <b>{result.email}</b>. They can activate by clicking the link in it.
              </p>
            ) : (
              <p className="text-sm text-amber-700">
                Email isn't configured, so share this activation link with the invitee directly:
              </p>
            )}
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
              <code className="flex-1 break-all text-xs text-slate-700">{result.acceptUrl}</code>
              <button
                onClick={() => { void navigator.clipboard.writeText(result.acceptUrl); toast.success('Copied'); }}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Full name"><Input {...register('fullName', { required: true })} /></Field>
            <Field label="Email"><Input type="email" {...register('email', { required: true })} /></Field>
            <Field label="Phone"><Input {...register('phone')} /></Field>
            <Field label="Roles">
              <div className="grid grid-cols-2 gap-2">
                {ASSIGNABLE.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" value={r} {...register('roles')} />
                    {r.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
