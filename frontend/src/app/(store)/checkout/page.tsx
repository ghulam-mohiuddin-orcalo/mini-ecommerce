'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/States';
import { formatPrice } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { useMe } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';
import { useCreateCheckoutSession } from '@/lib/hooks/usePayments';

export default function CheckoutPage() {
  const { data: user, isLoading: userLoading } = useMe();
  const { data: cart, isLoading } = useCart(Boolean(user));
  const createSession = useCreateCheckoutSession();

  const proceedToPayment = () => {
    createSession.mutate(undefined, {
      // Full-page navigation to Stripe's hosted Checkout (not router.push — it's an external URL).
      onSuccess: (session) => {
        window.location.href = session.url;
      },
    });
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

  // While Stripe redirects, keep the button busy so a slow network can't double-submit.
  const busy = createSession.isPending || createSession.isSuccess;

  return (
    <Shell>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Checkout</h1>

      {/* Step indicator */}
      <ol className="mb-7 mt-3 flex items-center gap-2.5 text-[13px] font-semibold">
        <li className="inline-flex items-center gap-2 text-brand-700">
          <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-brand-600 text-xs text-white">✓</span>
          Cart
        </li>
        <span aria-hidden="true" className="h-px w-6 bg-[#c7bfb1]" />
        <li className="inline-flex items-center gap-2 text-brand-700" aria-current="step">
          <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-brand-600 text-xs text-white">2</span>
          Payment
        </li>
        <span aria-hidden="true" className="h-px w-6 bg-[#c7bfb1]" />
        <li className="inline-flex items-center gap-2 text-faint">
          <span className="grid h-[22px] w-[22px] place-items-center rounded-full border border-[#c7bfb1] text-xs">3</span>
          Done
        </li>
      </ol>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-[18px]">
          <div className="rounded-xl border border-line bg-surface p-[22px] shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-base font-extrabold tracking-tight text-ink">Order summary</h2>
            <ul className="flex flex-col divide-y divide-[var(--color-line-soft)]">
              {cart.items.map((line) => (
                <li key={line.productId} className="flex items-center justify-between py-[11px] text-sm">
                  <span className="text-ink">
                    {line.name} <span className="text-muted">× {line.quantity}</span>
                  </span>
                  <span className="font-bold text-ink">{formatPrice(line.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-surface p-[22px] shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold tracking-tight text-ink">Payment</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-warning-soft)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--color-warning-ink)]">
                Stripe — test mode
              </span>
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
              You’ll be redirected to Stripe’s secure Checkout to pay. No order is created until
              Stripe confirms your payment. Use test card <span className="font-semibold text-ink">4242 4242 4242 4242</span>,
              any future expiry, and any CVC.
            </p>
          </div>
        </section>

        <aside className="h-fit rounded-xl border border-line bg-surface p-[22px] shadow-[var(--shadow-summary)] lg:sticky lg:top-20">
          <dl className="space-y-2.5 text-sm">
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
              <dd className="font-semibold text-brand-500">Free</dd>
            </div>
          </dl>
          <div className="my-4 h-px bg-line" />
          <div className="flex items-baseline justify-between">
            <span className="text-base font-extrabold text-ink">Total</span>
            <span className="text-[22px] font-extrabold tracking-tight text-brand-700">
              {formatPrice(cart.totalCents)}
            </span>
          </div>

          {createSession.isError && (
            <p role="alert" className="mt-3 text-sm text-[color:var(--color-danger)]">
              {createSession.error instanceof ApiError
                ? createSession.error.message
                : 'Could not start payment'}
            </p>
          )}

          <Button onClick={proceedToPayment} disabled={busy} size="lg" className="mt-[18px] w-full">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2.5" />
              <path d="M2 10h20" />
            </svg>
            {busy ? 'Redirecting to Stripe…' : 'Proceed to Payment'}
          </Button>
          <Link href="/cart" className="mt-3 block text-center text-sm text-muted hover:underline">
            Back to cart
          </Link>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-500)" strokeWidth="2" aria-hidden="true">
              <rect x="4" y="11" width="16" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Secured by Stripe
          </p>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>;
}
