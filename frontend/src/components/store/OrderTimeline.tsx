import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';

/** Forward fulfilment path. CANCELLED is handled separately as a terminal off-ramp. */
const FORWARD: { status: Exclude<OrderStatus, 'CANCELLED'>; label: string; icon: IconName; hint: string }[] = [
  { status: 'PENDING', label: 'Order placed', icon: 'check-circle', hint: 'We’ve received your order.' },
  { status: 'PROCESSING', label: 'Processing', icon: 'package', hint: 'We’re preparing your items.' },
  { status: 'SHIPPED', label: 'Shipped', icon: 'truck', hint: 'Your order is on its way.' },
  { status: 'DELIVERED', label: 'Delivered', icon: 'home', hint: 'Your order has arrived.' },
];

const RANK: Record<Exclude<OrderStatus, 'CANCELLED'>, number> = {
  PENDING: 0,
  PROCESSING: 1,
  SHIPPED: 2,
  DELIVERED: 3,
};

/**
 * Read-only tracking stepper derived from the order status. Mirrors the backend state machine
 * (PENDING → PROCESSING → SHIPPED → DELIVERED) for display only; the server stays authoritative.
 * A CANCELLED order renders a distinct terminal state.
 */
export function OrderTimeline({ status, placedAt }: { status: OrderStatus; placedAt: string }) {
  if (status === 'CANCELLED') {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] p-4"
      >
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-danger-soft)] text-[var(--color-danger-ink)] ring-1 ring-[var(--color-danger)]/40"
        >
          <Icon name="x-circle" size={18} />
        </span>
        <div>
          <p className="font-bold tracking-tight text-[var(--color-danger-ink)]">Order cancelled</p>
          <p className="text-sm text-ink-soft">This order was cancelled and any reserved stock was released.</p>
        </div>
      </div>
    );
  }

  const current = RANK[status];

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:gap-0">
      {FORWARD.map((step, i) => {
        const reached = RANK[step.status] <= current;
        const isCurrent = RANK[step.status] === current;
        const isLast = i === FORWARD.length - 1;

        return (
          <li key={step.status} className="relative flex flex-1 gap-3 sm:flex-col sm:gap-0">
            {/* Node + connector */}
            <div className="flex flex-col items-center sm:flex-row sm:items-center">
              <span
                className={cn(
                  'z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors duration-200',
                  reached
                    ? 'bg-brand-600 text-white shadow-[var(--shadow-btn)]'
                    : 'bg-paper-2 text-faint ring-1 ring-line',
                  isCurrent && 'ring-2 ring-brand-300 ring-offset-2 ring-offset-surface',
                )}
                aria-hidden="true"
              >
                <Icon name={reached ? step.icon : 'clock'} size={16} />
              </span>
              {/* Connector line: vertical on mobile, horizontal on desktop */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'w-0.5 flex-1 sm:h-0.5 sm:w-full',
                    'min-h-8 sm:min-h-0',
                    RANK[step.status] < current ? 'bg-brand-500' : 'bg-line',
                  )}
                />
              )}
            </div>
            {/* Text */}
            <div className={cn('pb-6 sm:pb-0 sm:pr-4 sm:pt-3', isLast && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-bold tracking-tight',
                  reached ? 'text-ink' : 'text-faint',
                )}
              >
                {step.label}
              </p>
              <p className={cn('text-xs', reached ? 'text-muted' : 'text-faint')}>{step.hint}</p>
              {step.status === 'PENDING' && (
                <p className="mt-0.5 text-xs text-muted">{formatDate(placedAt)}</p>
              )}
              {isCurrent && (
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  Current
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
