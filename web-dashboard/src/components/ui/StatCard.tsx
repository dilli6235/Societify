import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface StatCardProps {
  /** Small uppercase-ish label above the value. */
  label: string;
  /** The big serif metric. */
  value: ReactNode;
  /** Optional smaller suffix rendered inline after the value (e.g. "/ 12"). */
  sub?: ReactNode;
  /** Footnote under the value. */
  foot?: ReactNode;
  /** Tints the footnote/delta — positive (green) or negative (red). */
  trend?: 'up' | 'down';
  className?: string;
}

/**
 * KPI tile from the prototype: muted label, large Fraunces value, optional
 * delta footnote. The visual workhorse of every dashboard.
 */
export function StatCard({ label, value, sub, foot, trend, className }: StatCardProps) {
  return (
    <div className={cn('card p-[18px]', className)}>
      <div className="mb-2.5 text-xs text-muted">{label}</div>
      <div className="font-display text-[27px] font-medium leading-none tracking-[-0.02em] text-ink">
        {value}
        {sub != null && <span className="font-sans text-sm font-normal text-faint"> {sub}</span>}
      </div>
      {foot != null && (
        <div
          className={cn(
            'mt-2.5 text-xs text-muted',
            trend === 'up' && '[&_b]:text-green',
            trend === 'down' && '[&_b]:text-danger',
          )}
        >
          {foot}
        </div>
      )}
    </div>
  );
}
