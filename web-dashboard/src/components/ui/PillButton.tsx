import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `plain` = muted variant for secondary row actions. */
  variant?: 'accent' | 'plain';
}

/**
 * Small inline action used inside table rows — "Record", "▼ Receipt", "Edit".
 * Accent (lime) for the primary action, plain (muted) for the rest.
 */
export const PillButton = forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ variant = 'accent', className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'rounded-lg border border-line2 bg-transparent px-2.5 py-1 text-[11.5px] transition hover:bg-surface2',
        variant === 'accent' ? 'text-acid' : 'text-muted',
        className,
      )}
      {...props}
    />
  ),
);
PillButton.displayName = 'PillButton';
