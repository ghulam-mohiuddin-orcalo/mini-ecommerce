'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { QuantitySelector } from '@/components/store/QuantitySelector';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { useMe } from '@/lib/hooks/useAuth';
import {
  useCart,
  useClearCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from '@/lib/hooks/useCart';
import type { CartLine } from '@/lib/types';

/** Free-shipping threshold, in integer cents. Presentational only — the server never charges shipping. */
const FREE_SHIPPING_CENTS = 5000;

export default function CartPage() {
  const { data: user, isLoading: userLoading } = useMe();
  const { data: cart, isLoading, isError, refetch } = useCart(Boolean(user));
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const clearCart = useClearCart();

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
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </PageShell>
    );
  }

  const hasUnavailable = Boolean(cart?.items.some((line) => !line.available));

  return (
    <PageShell>
      <div className="pp-rise">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart' }]} className="mb-3" />
        <h1 className="font-serif text-[32px] font-medium tracking-tight text-ink">Your cart</h1>
      </div>

      {isLoading ? (
        <div className="mt-7">
          <CartSkeleton />
        </div>
      ) : isError ? (
        <div className="mt-7">
          <ErrorState onRetry={() => void refetch()} />
        </div>
      ) : !cart || cart.items.length === 0 ? (
        <div className="mt-7">
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
        <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-5">
            <FreeShippingMeter totalCents={cart.totalCents} />

            {hasUnavailable && (
              <p
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-4 py-3 text-sm font-medium text-[var(--color-danger-ink)]"
              >
                <Icon name="alert-triangle" size={17} className="mt-0.5 shrink-0" />
                Some items exceed available stock. Reduce their quantity to continue to checkout.
              </p>
            )}

            <ul className="flex flex-col divide-y divide-[var(--color-line-soft)] overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
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

            <div className="flex items-center justify-between">
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
              >
                <Icon name="arrow-left" size={16} />
                Continue shopping
              </Link>
              <button
                onClick={() => clearCart.mutate()}
                disabled={clearCart.isPending}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-[var(--color-danger)] disabled:opacity-50"
              >
                <Icon name="trash" size={15} />
                Clear cart
              </button>
            </div>
          </div>

          <aside className="h-fit lg:sticky lg:top-20">
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-summary)]">
              <h2 className="text-base font-extrabold tracking-tight text-ink">Order summary</h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">
                    Subtotal ({cart.itemCount} item{cart.itemCount === 1 ? '' : 's'})
                  </dt>
                  <dd className="font-semibold tabular-nums text-ink">{formatPrice(cart.totalCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Shipping</dt>
                  <dd className="font-semibold text-brand-500 dark:text-brand-300">Free</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Tax</dt>
                  <dd className="text-muted">Calculated at checkout</dd>
                </div>
              </dl>
              <div className="my-4 h-px bg-line" />
              <div className="flex items-baseline justify-between">
                <span className="text-base font-extrabold text-ink">Total</span>
                <span className="font-serif text-[26px] font-medium tracking-tight text-brand-700 dark:text-brand-300">
                  {formatPrice(cart.totalCents)}
                </span>
              </div>

              {hasUnavailable ? (
                <>
                  <Button className="mt-5 w-full" size="lg" disabled>
                    Resolve items to check out
                  </Button>
                  <p className="mt-2.5 text-center text-xs font-medium text-[var(--color-danger-ink)]">
                    Adjust the highlighted quantities above first.
                  </p>
                </>
              ) : (
                <Link href="/checkout" className="mt-5 block">
                  <Button className="w-full" size="lg">
                    Proceed to checkout
                    <Icon name="arrow-right" size={16} />
                  </Button>
                </Link>
              )}

              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
                <Icon name="shield-check" size={13} className="text-brand-500 dark:text-brand-300" />
                Secure checkout · you never leave the site
              </p>
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
    <li className={cn('flex gap-4 p-[18px]', !line.available && 'bg-[var(--color-danger-soft)]/35')}>
      <Link href={`/products/${line.productId}`} className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={line.imageUrl}
          alt={line.name}
          className="h-[84px] w-[84px] rounded-xl border border-line object-cover"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-0.5">
        <Link
          href={`/products/${line.productId}`}
          className="font-bold tracking-tight text-ink hover:underline"
        >
          {line.name}
        </Link>
        {line.variantLabel ? (
          <span className="text-[13px] text-muted">{line.variantLabel}</span>
        ) : null}
        <span className="text-[13px] text-muted">
          {formatPrice(line.unitPriceCents)} each · {line.category}
        </span>
        {!line.available && (
          <Badge tone="danger" className="mt-1 w-fit">
            <Icon name="alert-triangle" size={12} />
            Only {line.stock} in stock — reduce quantity
          </Badge>
        )}
        <div className="mt-2.5 flex items-center gap-3.5">
          <QuantitySelector
            value={line.quantity}
            min={1}
            max={Math.max(line.stock, 1)}
            disabled={updatePending}
            onChange={onUpdate}
          />
          <button
            onClick={onRemove}
            disabled={removePending}
            className="text-[13px] font-semibold text-muted transition-colors hover:text-[var(--color-danger)] disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
      <div className="text-right text-[17px] font-extrabold tabular-nums text-ink">
        {formatPrice(line.lineTotalCents)}
      </div>
    </li>
  );
}

/** Presentational free-shipping progress toward the $50 threshold (server never charges shipping). */
function FreeShippingMeter({ totalCents }: { totalCents: number }) {
  const qualified = totalCents >= FREE_SHIPPING_CENTS;
  const remaining = Math.max(FREE_SHIPPING_CENTS - totalCents, 0);
  const pct = Math.min(100, Math.round((totalCents / FREE_SHIPPING_CENTS) * 100));

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon
          name="truck"
          size={17}
          className={cn(qualified ? 'text-success' : 'text-brand-500 dark:text-brand-300')}
        />
        {qualified ? (
          <span>You’ve unlocked free shipping.</span>
        ) : (
          <span>
            Add <span className="text-brand-700 dark:text-brand-300">{formatPrice(remaining)}</span> more
            for free shipping.
          </span>
        )}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-2">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Progress toward free shipping"
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none',
            qualified ? 'bg-success' : 'bg-brand-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-5">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="flex flex-col divide-y divide-[var(--color-line-soft)] overflow-hidden rounded-2xl border border-line bg-surface">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-4 p-[18px]">
              <Skeleton className="h-[84px] w-[84px] rounded-xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="mt-2 h-9 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>;
}
