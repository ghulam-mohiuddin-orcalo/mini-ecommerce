import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Shared field styling: calm fill, clear border, pine focus ring. */
export const fieldClasses = cn(
  'h-11 w-full rounded-lg border border-line bg-field px-3.5 text-sm text-ink transition',
  'placeholder:text-muted focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-brand-500/15',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldClasses, className)} {...props} />;
  },
);
