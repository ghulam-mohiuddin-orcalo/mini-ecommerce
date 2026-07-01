'use client';

import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/**
 * A single checkout step panel: a titled card that shows only when it's the active step.
 *
 * `keepMounted` keeps the panel in the DOM (visually hidden) while inactive instead of unmounting
 * it — required for the Payment step, whose Stripe Payment Element must stay mounted or
 * `stripe.confirmPayment` loses its Element. Mount-and-unmount steps animate in with `pp-pop-in`;
 * so does the kept-mounted panel each time it becomes active (the class is re-applied on show).
 */
export function CheckoutStep({
  active,
  keepMounted = false,
  icon,
  title,
  description,
  children,
}: {
  active: boolean;
  keepMounted?: boolean;
  icon: IconName;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  if (!active && !keepMounted) return null;

  return (
    <section
      aria-hidden={!active}
      className={cn(
        'rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-7',
        active ? 'pp-pop-in' : 'hidden',
      )}
    >
      <header className="mb-6 flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:text-brand-300"
        >
          <Icon name={icon} size={19} />
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-[26px] font-medium leading-tight tracking-tight text-ink">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}
