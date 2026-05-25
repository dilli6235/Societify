import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'gray' | 'green' | 'red' | 'amber' | 'blue' | 'purple';

const tones: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-brand-100 text-brand-700',
  purple: 'bg-purple-100 text-purple-700',
};

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>
      {children}
    </span>
  );
}

/** Map a domain status string to a sensible badge tone. */
export function statusTone(status: string): Tone {
  const s = status.toUpperCase();
  if (['PAID', 'ACTIVE', 'APPROVED', 'RESOLVED', 'CONFIRMED', 'CHECKED_IN'].includes(s)) return 'green';
  if (['OVERDUE', 'DENIED', 'CANCELLED', 'DISABLED', 'URGENT', 'EMERGENCY'].includes(s)) return 'red';
  if (['PENDING_APPROVAL', 'PENDING', 'PARTIALLY_PAID', 'IN_PROGRESS', 'IMPORTANT', 'HIGH', 'REQUESTED'].includes(s))
    return 'amber';
  if (['ISSUED', 'OPEN', 'INFO'].includes(s)) return 'blue';
  return 'gray';
}
