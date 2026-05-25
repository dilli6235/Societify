import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, type Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Select } from '@/components/ui/Input';
import { Badge, statusTone } from '@/components/ui/Badge';
import { useList, useApiMutation } from '@/lib/hooks';
import { getOne, patch } from '@/lib/apiClient';

interface Society {
  id: string;
  name: string;
  slug: string;
  city: string;
  subscriptionStatus: string;
  plan?: { id: string; name: string } | null;
  _count?: { users: number; units: number };
}
interface Plan { id: string; name: string }

const STATUSES = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'];

export function PlatformSocietiesPage() {
  const [detailId, setDetailId] = useState<string | null>(null);
  const societies = useList<Society>(['platform-societies'], '/platform/societies');

  const columns: Column<Society>[] = [
    { header: 'Society', cell: (s) => <span className="font-medium text-slate-800">{s.name}</span> },
    { header: 'Slug', cell: (s) => <code className="text-xs text-slate-500">{s.slug}</code> },
    { header: 'City', cell: (s) => s.city },
    { header: 'Plan', cell: (s) => s.plan?.name ?? '—' },
    { header: 'Units', cell: (s) => s._count?.units ?? 0 },
    { header: 'Users', cell: (s) => s._count?.users ?? 0 },
    { header: 'Status', cell: (s) => <Badge tone={statusTone(s.subscriptionStatus)}>{s.subscriptionStatus}</Badge> },
  ];

  return (
    <div>
      <PageHeader title="Societies" subtitle="Every community on the platform" />
      <Table
        columns={columns}
        rows={societies.data?.items ?? []}
        rowKey={(s) => s.id}
        loading={societies.isLoading}
        onRowClick={(s) => setDetailId(s.id)}
      />
      {detailId && <SocietyDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function SocietyDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, refetch } = useQuery({ queryKey: ['platform-society', id], queryFn: () => getOne<Society>(`/platform/societies/${id}`) });
  const plans = useList<Plan>(['platform-plans'], '/platform/plans');
  const update = useApiMutation(
    (body: { subscriptionStatus?: string; planId?: string | null }) => patch(`/platform/societies/${id}`, body),
    { invalidate: [['platform-societies']], successMessage: 'Society updated' },
  );

  return (
    <Modal open onClose={onClose} title={data?.name ?? 'Society'}>
      {!data ? null : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <code>{data.slug}</code> · {data.city} ·
            <Badge tone={statusTone(data.subscriptionStatus)}>{data.subscriptionStatus}</Badge>
          </div>

          <Field label="Subscription status">
            <Select
              value={data.subscriptionStatus}
              onChange={(e) => update.mutateAsync({ subscriptionStatus: e.target.value }).then(() => refetch())}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>

          <Field label="Plan">
            <Select
              value={data.plan?.id ?? ''}
              onChange={(e) => update.mutateAsync({ planId: e.target.value || null }).then(() => refetch())}
            >
              <option value="">— No plan —</option>
              {plans.data?.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
