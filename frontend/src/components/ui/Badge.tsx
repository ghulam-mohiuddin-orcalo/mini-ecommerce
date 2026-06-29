import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'brand' | 'warning' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'bg-[#edeae3] text-[#6b665e]',
  brand: 'bg-brand-100 text-brand-700',
  warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning-ink)]',
  danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger-ink)]',
};

const dotColors: Record<Tone, string> = {
  neutral: 'bg-faint',
  brand: 'bg-brand-500',
  warning: 'bg-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger)]',
};

export function Badge({
  tone = 'neutral',
  dot = false,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', dotColors[tone])} />
      )}
      {children}
    </span>
  );
}
