'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatPrice } from '@/lib/format';
import type { Address } from '@/lib/checkout-validation';
import type { Cart } from '@/lib/types';
import { countryName } from './AddressFields';

/**
 * Final step content: the order line items plus read-only summaries of the shipping destination and
 * payment/billing details, each with an "Edit" affordance that jumps back to the owning step. Reads
 * the same parent state the earlier steps wrote — no re-entry of data, nothing recomputed here.
 */
export function ReviewStep({
  cart,
  shipping,
  billing,
  billingSame,
  onEditShipping,
  onEditPayment,
}: {
  cart: Cart;
  shipping: Address;
  billing: Address;
  billingSame: boolean;
  onEditShipping: () => void;
  onEditPayment: () => void;
}) {
  const billingAddr = billingSame ? shipping : billing;

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col divide-y divide-[var(--color-line-soft)]">
        {cart.items.map((line) => (
          <li
            key={`${line.productId}:${line.variantId ?? 'base'}`}
            className="flex items-center gap-4 py-3.5 first:pt-0"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-gradient-to-br from-brand-50 to-brand-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={line.imageUrl} alt="" className="h-full w-full object-cover" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-bold tracking-tight text-ink">{line.name}</p>
              <p className="mt-0.5 text-[13px] text-muted">
                {line.variantLabel ? `${line.variantLabel} · ` : ''}
                Qty {line.quantity} · {formatPrice(line.unitPriceCents)} each
              </p>
            </div>
            <span className="text-sm font-bold tabular-nums text-ink">
              {formatPrice(line.lineTotalCents)}
            </span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryBlock icon="truck" title="Ship to" onEdit={onEditShipping} editLabel="Edit shipping">
          <p className="font-semibold text-ink">{shipping.fullName}</p>
          <AddressLines address={shipping} />
          <p className="mt-1.5 text-muted">{shipping.email}</p>
          <p className="text-muted">{shipping.phone}</p>
        </SummaryBlock>

        <SummaryBlock icon="wallet" title="Payment" onEdit={onEditPayment} editLabel="Edit payment">
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            <Icon name="lock" size={14} className="text-brand-500 dark:text-brand-300" />
            Card · secured by Stripe
          </p>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-faint">
            Billing address
          </p>
          {billingSame ? (
            <p className="text-muted">Same as shipping address</p>
          ) : (
            <>
              <p className="font-semibold text-ink">{billingAddr.fullName}</p>
              <AddressLines address={billingAddr} />
            </>
          )}
        </SummaryBlock>
      </div>
    </div>
  );
}

function AddressLines({ address }: { address: Address }) {
  return (
    <div className="text-muted">
      <p>{address.line1}</p>
      {address.line2 && <p>{address.line2}</p>}
      <p>
        {address.city}, {address.state} {address.postal}
      </p>
      <p>{countryName(address.country)}</p>
    </div>
  );
}

function SummaryBlock({
  icon,
  title,
  editLabel,
  onEdit,
  children,
}: {
  icon: 'truck' | 'wallet';
  title: string;
  editLabel: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper-2 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-bold tracking-tight text-ink">
          <Icon name={icon} size={16} className="text-brand-500 dark:text-brand-300" />
          {title}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-300"
        >
          <Icon name="edit" size={13} />
          <span className="sr-only">{editLabel}</span>
          <span aria-hidden="true">Edit</span>
        </button>
      </div>
      <div className="space-y-0.5 text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}
