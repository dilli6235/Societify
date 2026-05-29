import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface HeroProps {
  children: ReactNode;
  /** Right-aligned content, typically a CTA button. */
  action?: ReactNode;
  className?: string;
}

/**
 * Gradient banner from the prototype's `.resbanner` — used for the resident
 * "current dues" hero and similar headline strips.
 */
export function Hero({ children, action, className }: HeroProps) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line',
        'bg-gradient-to-br from-surface2 to-surface3 p-5',
        className,
      )}
    >
      <div>{children}</div>
      {action}
    </div>
  );
}
