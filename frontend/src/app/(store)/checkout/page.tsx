'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { formatPrice } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { useMe } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';
import { MOCK_DECLINE_TOKEN, useCheckout } from '@/lib/hooks/useOrders';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useMe();
  const { data: cart, isLoading } = useCart(Boolean(user));
  const checkout = useCheckout();
  const [simulateDecline, setSimulateDecline] = useState(false);

  const placeOrder = () => {
    checkout.mutate(
      { paymentToken: simulateDecline ? MOCK_DECLINE_TOKEN : undefined },
      { onSuccess: (order) => router.push(`/orders/${order.id}?placed=1`) },
    );
  };

  if (userLoading) return <Shell><Skeleton className="h-48 w-full" /></Shell>;

  if (!user) {
    return (
      <Shell>
        <EmptyState
          title="Sign in to check out"
          action={<Link href="/login"><Button>Sign in</Button></Link>}
        />
      </Shell>
    );
  }

  if (isLoading) return <Shell><Skeleton className="h-48 w-full" /></Shell>;

  if (!cart || cart.items.length === 0) {
    return (
      <Shell>
        <EmptyState
          title="Your cart is empty"
          description="Add something before checking out."
          action={<Link href="/products"><Button>Browse the catalog</Button></Link>}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight text-ink">Checkout</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-lg font-semibold text-ink">Order summary</h2>
            <ul className="flex flex-col divide-y divide-line">
              {cart.items.map((line) => (
                <li key={line.productId} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-ink">
                    {line.name} <span className="text-muted">× {line.quantity}</span>
                  </span>
                  <span className="font-medium text-ink">{formatPrice(line.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <h2 className="text-lg font-semibold text-ink">Payment</h2>
            <p className="mt-1 text-sm text-muted">
              This is a <strong>mock payment</strong> — no real card is charged.
            </p>
            <label className="mt-3 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={simulateDecline}
                onChange={(e) => setSimulateDecline(e.target.checked)}
              />
              Simulate a declined payment
            </label>
          </div>
        </section>

        <aside className="h-fit rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-20">
          <dl className="flex justify-between text-sm">
            <dt className="text-muted">Items</dt>
            <dd className="text-ink">{cart.itemCount}</dd>
          </dl>
          <dl className="mt-2 flex justify-between border-t border-line pt-3 text-base font-semibold">
            <dt className="text-ink">Total</dt>
            <dd className="text-brand-700">{formatPrice(cart.totalCents)}</dd>
          </dl>

          {checkout.isError && (
            <p role="alert" className="mt-3 text-sm text-[color:var(--color-danger)]">
              {checkout.error instanceof ApiError ? checkout.error.message : 'Checkout failed'}
            </p>
          )}

          <Button onClick={placeOrder} disabled={checkout.isPending} size="lg" className="mt-4 w-full">
            {checkout.isPending ? 'Placing order…' : `Pay ${formatPrice(cart.totalCents)}`}
          </Button>
          <Link href="/cart" className="mt-3 block text-center text-sm text-muted hover:underline">
            Back to cart
          </Link>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>;
}
