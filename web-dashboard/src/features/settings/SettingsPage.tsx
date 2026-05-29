import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { Panel } from '@/components/ui/Panel';
import { Field, Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getOne, patch } from '@/lib/apiClient';
import { useApiMutation } from '@/lib/hooks';
import { useHasRole } from '@/features/auth/guards';

interface SocietySettings {
  name: string;
  gstin: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  maintenanceMethod: 'FIXED' | 'PER_SQFT';
  maintenanceFixedAmount: string | null;
  maintenanceRatePerSqft: string | null;
  dueDay: number;
  gracePeriodDays: number;
  lateFee: string | null;
}

export function SettingsPage() {
  const society = useQuery({ queryKey: ['society'], queryFn: () => getOne<SocietySettings>('/properties/society') });

  return (
    <div>
      <PageHeader title="Settings" subtitle="Association identity & maintenance calculation" />
      {society.isLoading || !society.data ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <SettingsForm data={society.data} />
      )}
    </div>
  );
}

interface FormVals {
  name: string;
  gstin: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  maintenanceMethod: 'FIXED' | 'PER_SQFT';
  maintenanceFixedAmount: number;
  maintenanceRatePerSqft: number;
  dueDay: number;
  gracePeriodDays: number;
  lateFee: number;
}

function SettingsForm({ data }: { data: SocietySettings }) {
  const canEdit = useHasRole('SOCIETY_ADMIN');
  const { register, handleSubmit, watch } = useForm<FormVals>({
    defaultValues: {
      name: data.name,
      gstin: data.gstin ?? '',
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 ?? '',
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      maintenanceMethod: data.maintenanceMethod,
      maintenanceFixedAmount: Number(data.maintenanceFixedAmount ?? 0),
      maintenanceRatePerSqft: Number(data.maintenanceRatePerSqft ?? 0),
      dueDay: data.dueDay,
      gracePeriodDays: data.gracePeriodDays,
      lateFee: Number(data.lateFee ?? 0),
    },
  });

  const save = useApiMutation(
    (v: FormVals) =>
      patch('/properties/society', {
        name: v.name,
        gstin: v.gstin || null,
        addressLine1: v.addressLine1,
        addressLine2: v.addressLine2 || null,
        city: v.city,
        state: v.state,
        postalCode: v.postalCode,
        maintenanceMethod: v.maintenanceMethod,
        maintenanceFixedAmount: Number(v.maintenanceFixedAmount),
        maintenanceRatePerSqft: Number(v.maintenanceRatePerSqft),
        dueDay: Number(v.dueDay),
        gracePeriodDays: Number(v.gracePeriodDays),
        lateFee: Number(v.lateFee),
      }),
    { invalidate: [['society'], ['dashboard']], successMessage: 'Settings saved' },
  );

  const method = watch('maintenanceMethod');

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
      {!canEdit && (
        <p className="rounded-lg border border-line bg-surface2 px-4 py-2.5 text-sm text-muted">
          You can view these settings; only a society admin can change them.
        </p>
      )}

      {/* Identity */}
      <Panel title="Association identity" subtitle="Prints on every bill, receipt & voucher PDF">
        <div className="space-y-4">
          <Field label="Association name"><Input {...register('name', { required: true })} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="GSTIN"><Input placeholder="29ABCDE1234F1Z5" {...register('gstin')} /></Field>
            <Field label="Address line 1"><Input {...register('addressLine1', { required: true })} /></Field>
            <Field label="Address line 2"><Input {...register('addressLine2')} /></Field>
            <Field label="City"><Input {...register('city', { required: true })} /></Field>
            <Field label="State"><Input {...register('state', { required: true })} /></Field>
            <Field label="Postal code"><Input {...register('postalCode', { required: true })} /></Field>
          </div>
        </div>
      </Panel>

      {/* Maintenance calculation */}
      <Panel title="Maintenance calculation" subtitle="Drives bulk bill generation and the per-unit charge">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Method">
            <Select {...register('maintenanceMethod')}>
              <option value="FIXED">Fixed amount per unit</option>
              <option value="PER_SQFT">Per sq.ft × carpet area</option>
            </Select>
          </Field>
          <div className="hidden sm:block" />
          <Field label="Fixed amount per unit (₹)">
            <Input type="number" step="0.01" disabled={method !== 'FIXED'} {...register('maintenanceFixedAmount')} />
          </Field>
          <Field label="Rate per sq.ft (₹)">
            <Input type="number" step="0.01" disabled={method !== 'PER_SQFT'} {...register('maintenanceRatePerSqft')} />
          </Field>
          <Field label="Due day of month"><Input type="number" min={1} max={28} {...register('dueDay')} /></Field>
          <Field label="Grace period (days)"><Input type="number" min={0} max={90} {...register('gracePeriodDays')} /></Field>
          <Field label="Late fee after grace (₹)"><Input type="number" step="0.01" {...register('lateFee')} /></Field>
        </div>
      </Panel>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending}>Save changes</Button>
        </div>
      )}
    </form>
  );
}
