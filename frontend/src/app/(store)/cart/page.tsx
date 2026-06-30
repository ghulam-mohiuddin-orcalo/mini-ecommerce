'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { QuantitySelector } from '@/components/store/QuantitySelector';
import { formatPrice } from '@/lib/format';
import { useMe } from '@/lib/hooks/useAuth';
import {
  useCart,
  useClearCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from '@/lib/hooks/useCart';

export default function CartPage() {
  const { data: user, isLoading: userLoading } = useMe();
  const { data: cart, isLoading, isError, refetch } = useCart(Boolean(user));
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const clearCart = useClearCart();

  if (userLoading) {
    return <PageShell><Skeleton className="h-40 w-full" /></PageShell>;
  }

  if (!user) {
    return (
      <PageShell>
        <EmptyState
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

  return (
    <PageShell>
      <h1 className="mb-6 font-serif text-[32px] font-medium tracking-tight text-ink">Your cart</h1>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !cart || cart.items.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          description="Browse the catalog and add something you like."
          action={
            <Link href="/products">
              <Button>Browse the catalog</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <ul className="flex flex-col divide-y divide-[var(--color-line-soft)] overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]">
            {cart.items.map((line) => (
              <li key={line.productId} className="flex gap-4 p-[18px]">
                <Link href={`/products/${line.productId}`} className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={line.imageUrl}
                    alt={line.name}
                    className="h-[82px] w-[82px] rounded-xl border border-line object-cover"
                  />
                </Link>
                <div className="flex flex-1 flex-col gap-0.5">
                  <Link
                    href={`/products/${line.productId}`}
                    className="font-bold tracking-tight text-ink hover:underline"
                  >
                    {line.name}
                  </Link>
                  <span className="text-[13px] text-muted">
                    {formatPrice(line.unitPriceCents)} each · {line.category}
                  </span>
                  {!line.available && (
                    <span className="mt-0.5 text-xs font-bold text-[var(--color-danger-ink)]">
                      Only {line.stock} in stock — reduce quantity
                    </span>
                  )}
                  <div className="mt-2.5 flex items-center gap-3.5">
                    <QuantitySelector
                      value={line.quantity}
                      min={1}
                      max={Math.max(line.stock, 1)}
                      disabled={updateItem.isPending}
                      onChange={(quantity) =>
                        updateItem.mutate({ productId: line.productId, quantity })
                      }
                    />
                    <button
                      onClick={() => removeItem.mutate(line.productId)}
                      disabled={removeItem.isPending}
                      className="text-[13px] font-semibold text-muted transition-colors hover:text-[var(--color-danger)]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="text-right text-[17px] font-extrabold text-ink">
                  {formatPrice(line.lineTotalCents)}
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-xl border border-line bg-surface p-[22px] shadow-[var(--shadow-summary)] lg:sticky lg:top-20">
            <h2 className="text-[17px] font-extrabold tracking-tight text-ink">Order summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Items</dt>
                <dd className="font-semibold text-ink">{cart.itemCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-semibold text-ink">{formatPrice(cart.totalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd className="font-semibold text-brand-500 dark:text-brand-300">Free</dd>
              </div>
            </dl>
            <div className="my-4 h-px bg-line" />
            <div className="flex items-baseline justify-between">
              <span className="text-base font-extrabold text-ink">Total</span>
              <span className="text-[22px] font-extrabold tracking-tight text-brand-700 dark:text-brand-300">
                {formatPrice(cart.totalCents)}
              </span>
            </div>
            <Link href="/checkout" className="mt-[18px] block">
              <Button className="w-full" size="lg">
                Proceed to checkout
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Button>
            </Link>
            <button
              onClick={() => clearCart.mutate()}
              disabled={clearCart.isPending}
              className="mt-3 w-full text-[13px] font-semibold text-muted transition-colors hover:text-[var(--color-danger)]"
            >
              Clear cart
            </button>
          </aside>
        </div>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>;
}
