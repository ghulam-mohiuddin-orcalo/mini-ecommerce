'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Container } from '@/components/store/Container';
import { QuantitySelector } from '@/components/store/QuantitySelector';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { signinHref } from '@/lib/authNav';
import { useMe } from '@/lib/hooks/useAuth';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/lib/hooks/useCart';
import type { CartLine } from '@/lib/types';

/**
 * Presentational shipping estimate (money in integer cents). The server settles the order
 * on product totals only; this threshold/fee is a storefront display, mirroring the design.
 */
const FREE_SHIPPING_CENTS = 7500;
const SHIPPING_FEE_CENTS = 695;

export default function CartPage() {
  const { data: user, isLoading: userLoading } = useMe();
  const { data: cart, isLoading, isError, refetch } = useCart(Boolean(user));
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  if (userLoading) {
    return (
      <PageShell>
        <CartSkeleton />
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <EmptyState
          icon={<Icon name="cart" size={28} />}
          title="Sign in to view your cart"
          description="Your cart is saved to your account and follows you across sessions."
          action={
            <Link href={signinHref('/cart')}>
              <Button>Sign in</Button>
            </Link>
          }
        />
      </PageShell>
    );
  }

  const hasUnavailable = Boolean(cart?.items.some((line) => !line.available));
  const subtotalCents = cart?.totalCents ?? 0;
  const freeShipping = subtotalCents >= FREE_SHIPPING_CENTS;
  const shippingCents = freeShipping ? 0 : SHIPPING_FEE_CENTS;
  const orderTotalCents = subtotalCents + shippingCents;

  return (
    <PageShell>
      <div className="pp-rise">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} className="mb-4" />
        <h1 className="font-serif text-[clamp(32px,4vw,48px)] font-medium leading-none tracking-[-0.02em] text-ink">
          Your cart
        </h1>
      </div>

      {isLoading ? (
        <div className="mt-8">
          <CartSkeleton />
        </div>
      ) : isError ? (
        <div className="mt-8">
          <ErrorState onRetry={() => void refetch()} />
        </div>
      ) : !cart || cart.items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Icon name="cart" size={28} />}
            title="Your cart is empty"
            description="Browse the catalog and add something you like."
            action={
              <Link href="/products">
                <Button>Browse the catalog</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-9 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="flex flex-col gap-4">
            {hasUnavailable && (
              <p
                role="alert"
                className="flex items-start gap-2.5 rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-4 py-3 text-sm font-medium text-[var(--color-danger-ink)]"
              >
                <Icon name="alert-triangle" size={17} className="mt-0.5 shrink-0" />
                Some items exceed available stock. Reduce their quantity to continue to checkout.
              </p>
            )}

            <ul className="flex flex-col gap-3.5">
              {cart.items.map((line) => (
                <CartRow
                  key={`${line.productId}:${line.variantId ?? 'base'}`}
                  line={line}
                  updatePending={updateItem.isPending}
                  removePending={removeItem.isPending}
                  onUpdate={(quantity) =>
                    updateItem.mutate({
                      productId: line.productId,
                      quantity,
                      variantId: line.variantId,
                    })
                  }
                  onRemove={() =>
                    removeItem.mutate({
                      productId: line.productId,
                      variantId: line.variantId,
                    })
                  }
                />
              ))}
            </ul>
          </div>

          <aside className="h-fit lg:sticky lg:top-24">
            <div className="rounded-[22px] border border-line bg-surface p-[26px] shadow-[var(--shadow-summary)]">
              <h2 className="font-serif text-2xl font-medium tracking-tight text-ink">Order summary</h2>

              <dl className="mt-5 grid gap-[13px] border-t border-line py-[18px] text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="font-semibold tabular-nums text-ink">{formatPrice(subtotalCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Shipping</dt>
                  {freeShipping ? (
                    <dd className="font-semibold text-brand-500 dark:text-brand-300">Free</dd>
                  ) : (
                    <dd className="font-semibold tabular-nums text-ink">{formatPrice(shippingCents)}</dd>
                  )}
                </div>
              </dl>

              <div className="flex items-baseline justify-between border-t border-line pt-4">
                <span className="text-base font-bold text-ink">Total</span>
                <span className="font-serif text-[30px] font-medium tracking-tight text-ink">
                  {formatPrice(orderTotalCents)}
                </span>
              </div>

              {hasUnavailable ? (
                <>
                  <Button className="mt-[22px] h-[54px] w-full rounded-[14px]" size="lg" disabled>
                    Resolve items to check out
                  </Button>
                  <p className="mt-2.5 text-center text-xs font-medium text-[var(--color-danger-ink)]">
                    Adjust the highlighted quantities above first.
                  </p>
                </>
              ) : (
                <Link href="/checkout" className="mt-[22px] block">
                  <Button className="h-[54px] w-full rounded-[14px]" size="lg">
                    Checkout
                    <Icon name="arrow-right" size={16} />
                  </Button>
                </Link>
              )}

              <Link
                href="/products"
                className="mt-2.5 flex h-11 items-center justify-center rounded-xl text-sm font-semibold text-muted transition-colors hover:text-ink"
              >
                Continue shopping
              </Link>
            </div>
          </aside>
        </div>
      )}
    </PageShell>
  );
}

function CartRow({
  line,
  updatePending,
  removePending,
  onUpdate,
  onRemove,
}: {
  line: CartLine;
  updatePending: boolean;
  removePending: boolean;
  onUpdate: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <li
      className={cn(
        'flex gap-[18px] rounded-[18px] border border-line bg-surface p-[18px]',
        !line.available && 'border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)]/35',
      )}
    >
      <Link href={`/products/${line.productId}`} className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={line.imageUrl}
          alt={line.name}
          className="h-[104px] w-[104px] rounded-[14px] border border-line object-cover"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/products/${line.productId}`}
              className="text-base font-bold tracking-tight text-ink hover:underline"
            >
              {line.name}
            </Link>
            <p className="mt-[3px] text-[13px] text-muted">
              {line.variantLabel ? `${line.variantLabel} · ` : ''}
              {line.category} · {formatPrice(line.unitPriceCents)} each
            </p>
            {!line.available && (
              <Badge tone="danger" className="mt-1.5 w-fit">
                <Icon name="alert-triangle" size={12} />
                Only {line.stock} in stock — reduce quantity
              </Badge>
            )}
          </div>
          <button
            onClick={onRemove}
            disabled={removePending}
            aria-label={`Remove ${line.name}`}
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] text-faint transition-colors hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] disabled:opacity-50"
          >
            <Icon name="x" size={17} />
          </button>
        </div>
        <div className="flex items-end justify-between gap-3">
          <QuantitySelector
            value={line.quantity}
            min={1}
            max={Math.max(line.stock, 1)}
            disabled={updatePending}
            onChange={onUpdate}
          />
          <span className="text-lg font-extrabold tabular-nums text-ink">
            {formatPrice(line.lineTotalCents)}
          </span>
        </div>
      </div>
    </li>
  );
}

function CartSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-9 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="flex flex-col gap-3.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-[18px] rounded-[18px] border border-line bg-surface p-[18px]">
            <Skeleton className="h-[104px] w-[104px] rounded-[14px]" />
            <div className="flex flex-1 flex-col justify-between gap-3 py-0.5">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <div className="flex items-end justify-between">
                <Skeleton className="h-9 w-28 rounded-[10px]" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-[300px] w-full rounded-[22px]" />
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <Container className="pb-24 pt-9">{children}</Container>;
}
