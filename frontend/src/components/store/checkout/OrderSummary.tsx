'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatPrice } from '@/lib/format';
import type { Cart } from '@/lib/types';

/**
 * Sticky order-summary card shown alongside every checkout step. Presentational only — the amount
 * charged is the server-authoritative `amountCents` from the PaymentIntent; shipping/tax lines
 * mirror the storefront display and are never added to what Stripe collects.
 */
export function OrderSummary({ cart, amountCents }: { cart: Cart; amountCents: number }) {
  return (
    <aside className="h-fit lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-[22px] border border-line bg-surface p-[26px] shadow-[var(--shadow-summary)]">
        <h2 className="font-serif text-2xl font-medium tracking-tight text-ink">Summary</h2>

        <ul className="mt-4 flex flex-col divide-y divide-[var(--color-line-soft)]">
          {cart.items.map((line) => (
            <li
              key={`${line.productId}:${line.variantId ?? 'base'}`}
              className="flex items-center gap-3 py-3"
            >
              <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-50 to-brand-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={line.imageUrl} alt="" className="h-full w-full object-cover" />
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                  {line.quantity}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-semibold text-ink">{line.name}</p>
                {line.variantLabel ? (
                  <p className="line-clamp-1 text-xs text-muted">{line.variantLabel}</p>
                ) : null}
                <p className="text-xs text-muted">{formatPrice(line.unitPriceCents)} each</p>
              </div>
              <span className="text-sm font-bold tabular-nums text-ink">
                {formatPrice(line.lineTotalCents)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2.5 border-t border-line-soft pt-4 text-sm">
          <Row label={`Subtotal (${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'})`}>
            {formatPrice(cart.totalCents)}
          </Row>
          <Row label="Shipping">
            <span className="font-semibold text-brand-500 dark:text-brand-300">Free</span>
          </Row>
          <Row label="Tax">
            <span className="text-muted">—</span>
          </Row>
        </dl>

        <div className="mt-4 flex items-baseline justify-between border-t border-line-soft pt-4">
          <span className="text-base font-extrabold text-ink">Total</span>
          <span className="font-serif text-[30px] font-medium tracking-tight text-brand-700 dark:text-brand-300">
            {formatPrice(amountCents)}
          </span>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Icon name="shield-check" size={13} className="text-brand-500 dark:text-brand-300" />
          Secured by Stripe · you never leave the site
        </p>
      </div>
    </aside>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{children}</dd>
    </div>
  );
}
