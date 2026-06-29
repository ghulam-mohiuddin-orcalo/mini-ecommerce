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
      <h1 className="mb-6 text-3xl font-semibold tracking-tight text-ink">Your cart</h1>

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
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
            {cart.items.map((line) => (
              <li key={line.productId} className="flex gap-4 p-4">
                <Link href={`/products/${line.productId}`} className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={line.imageUrl}
                    alt={line.name}
                    className="h-20 w-20 rounded-lg border border-line object-cover"
                  />
                </Link>
                <div className="flex flex-1 flex-col gap-1">
                  <Link href={`/products/${line.productId}`} className="font-medium text-ink hover:underline">
                    {line.name}
                  </Link>
                  <span className="text-sm text-muted">{formatPrice(line.unitPriceCents)} each</span>
                  {!line.available && (
                    <span className="text-xs font-medium text-[color:var(--color-danger)]">
                      Only {line.stock} in stock — reduce quantity
                    </span>
                  )}
                  <div className="mt-1 flex items-center gap-3">
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
                      className="text-sm font-medium text-muted hover:text-[color:var(--color-danger)]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="text-right font-semibold text-ink">
                  {formatPrice(line.lineTotalCents)}
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-20">
            <h2 className="text-lg font-semibold text-ink">Order summary</h2>
            <dl className="mt-4 flex justify-between text-sm">
              <dt className="text-muted">Items</dt>
              <dd className="text-ink">{cart.itemCount}</dd>
            </dl>
            <dl className="mt-2 flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt className="text-ink">Total</dt>
              <dd className="text-brand-700">{formatPrice(cart.totalCents)}</dd>
            </dl>
            <p className="mt-3 text-xs text-muted">Checkout arrives in the next step.</p>
            <button
              onClick={() => clearCart.mutate()}
              disabled={clearCart.isPending}
              className="mt-4 w-full text-sm font-medium text-muted hover:text-[color:var(--color-danger)]"
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
