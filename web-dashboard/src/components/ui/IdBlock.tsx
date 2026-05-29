import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A single key/value row inside an {@link IdBlock}. */
export function KV({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex justify-between border-b border-line py-[7px] text-[13px] last:border-0">
      <span className="text-faint">{k}</span>
      <span className="font-medium text-ink">{v}</span>
    </div>
  );
}

interface IdBlockProps {
  /** Eyebrow label, e.g. "Owner" / "Current resident". */
  role: string;
  /** Accent for the role eyebrow. */
  tone?: 'owner' | 'resident' | 'default';
  /** Glyph shown before the role label. */
  glyph?: ReactNode;
  children: ReactNode;
  className?: string;
}

const toneClass: Record<NonNullable<IdBlockProps['tone']>, string> = {
  owner: 'text-info',
  resident: 'text-amberx',
  default: 'text-muted',
};

/**
 * Identity card (owner / resident) — surface2 panel with an accented eyebrow
 * and a stack of {@link KV} rows. Mirrors the prototype's `.idblock`.
 */
export function IdBlock({ role, tone = 'default', glyph, children, className }: IdBlockProps) {
  return (
    <div className={cn('rounded-[14px] border border-line bg-surface2 p-[18px]', className)}>
      <div className={cn('mb-3.5 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.06em]', toneClass[tone])}>
        {glyph}
        {role}
      </div>
      {children}
    </div>
  );
}
