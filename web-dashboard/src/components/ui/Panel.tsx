import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PanelProps {
  title?: string;
  subtitle?: string;
  /** Rendered on the right of the panel header (e.g. a tag or action). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Section container with a Fraunces title + muted subtitle header — the
 * prototype's `.panel` / `.ph`.
 */
export function Panel({ title, subtitle, aside, children, className, bodyClassName }: PanelProps) {
  return (
    <div className={cn('card p-5', className)}>
      {(title || aside) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="font-display text-base font-medium text-ink">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {aside}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
