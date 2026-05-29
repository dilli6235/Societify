import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'gray' | 'green' | 'red' | 'amber' | 'blue' | 'purple';

const tones: Record<Tone, string> = {
  gray: 'bg-surface3 text-muted',
  green: 'bg-green-dim/45 text-[#bff5dc]',
  red: 'bg-danger-dim/55 text-[#ffb3af]',
  amber: 'bg-amberx-dim/55 text-[#f5d28a]',
  blue: 'bg-info-dim/55 text-[#c7e3fb]',
  purple: 'bg-[#322a5a]/70 text-[#cfc4f5]',
};

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-medium', tones[tone])}>
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
