'use client';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/** The three ordered checkout stages. Index is the canonical step number (0-based). */
export const CHECKOUT_STEPS = ['Shipping', 'Payment', 'Review'] as const;

/**
 * Horizontal progress stepper for the checkout flow: numbered 40px circles joined by a track that
 * fills up to the current step. Completed steps show a check, the current step is filled + ringed,
 * upcoming steps stay muted. Purely a progress indicator — navigation happens via the form buttons.
 */
export function CheckoutStepper({ current, className }: { current: number; className?: string }) {
  const lastIndex = CHECKOUT_STEPS.length - 1;
  const progress = lastIndex === 0 ? 0 : current / lastIndex;

  return (
    <ol
      aria-label="Checkout progress"
      className={cn('relative mx-auto flex w-full max-w-[520px] items-start justify-between', className)}
    >
      {/* Base track + filled progress, pinned to the vertical centre of the 40px circles. */}
      <span aria-hidden="true" className="absolute inset-x-5 top-5 h-0.5 -translate-y-1/2 rounded-full bg-line" />
      <span
        aria-hidden="true"
        className="absolute left-5 top-5 h-0.5 -translate-y-1/2 rounded-full bg-brand-600 transition-[width] duration-500 ease-out"
        style={{ width: `calc((100% - 2.5rem) * ${progress})` }}
      />

      {CHECKOUT_STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li
            key={label}
            aria-current={state === 'current' ? 'step' : undefined}
            className="relative z-10 flex flex-col items-center gap-2"
          >
            <span
              aria-hidden="true"
              className={cn(
                'grid h-10 w-10 place-items-center rounded-full border-2 text-[13px] font-extrabold tabular-nums transition-all duration-300',
                state === 'todo' && 'border-line bg-surface text-muted',
                state === 'current' && 'border-brand-600 bg-brand-600 text-white ring-4 ring-brand-600/15',
                state === 'done' && 'border-brand-600 bg-brand-600 text-white',
              )}
            >
              {state === 'done' ? <Icon name="check" size={18} /> : String(i + 1).padStart(2, '0')}
            </span>
            <span
              className={cn(
                'text-[13px] font-bold tracking-tight transition-colors',
                i <= current ? 'text-ink' : 'text-muted',
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
