import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'brand' | 'warning' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'bg-brand-50 text-brand-700',
  brand: 'bg-brand-100 text-brand-800',
  warning: 'bg-amber-100 text-[color:var(--color-warning)]',
  danger: 'bg-red-100 text-[color:var(--color-danger)]',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
