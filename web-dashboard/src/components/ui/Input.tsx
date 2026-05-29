import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

export function Field({ label, error, children }: { label?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-[12.5px] font-medium text-muted">{label}</span>}
      {children}
      {error && <span className="block text-xs text-danger">{error}</span>}
    </label>
  );
}

const base =
  'w-full rounded-[10px] border border-line2 bg-surface2 px-3 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-green focus:ring-1 focus:ring-green/40';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, className)} {...props} />,
);
Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(base, className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(base, 'min-h-[90px]', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';
