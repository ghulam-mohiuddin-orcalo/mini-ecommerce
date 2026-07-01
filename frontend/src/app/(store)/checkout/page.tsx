'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Elements } from '@stripe/react-stripe-js';
import type { Appearance, StripeElementsOptions } from '@stripe/stripe-js';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Icon } from '@/components/ui/Icon';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Container } from '@/components/store/Container';
import { CheckoutForm } from '@/components/store/CheckoutForm';
import { ApiError } from '@/lib/api';
import { getStripe } from '@/lib/stripe';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { useCart } from '@/lib/hooks/useCart';
import { usePaymentIntent } from '@/lib/hooks/usePayments';
import { usePreferences } from '@/lib/hooks/usePreferences';

const stripePromise = getStripe();

/**
 * Stripe Elements appearance — a third-party iframe that cannot read our CSS variables, so the
 * palette is supplied as literals here (the one place hard-coded colors are unavoidable). Tuned to
 * the Verdant surfaces for both themes; `theme` swaps base styling, variables refine it.
 */
function appearanceFor(theme: 'light' | 'dark'): Appearance {
  const dark = theme === 'dark';
  return {
    theme: dark ? 'night' : 'stripe',
    variables: {
      colorPrimary: dark ? '#87b4a0' : '#2c5d4a',
      colorBackground: dark ? '#21262d' : '#fcfbf9',
      colorText: dark ? '#f1eee8' : '#1b1a18',
      colorDanger: dark ? '#e0654a' : '#bd4a30',
      fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif',
      borderRadius: '11px',
      spacingUnit: '4px',
    },
  };
}

export default function CheckoutPage() {
  const { user, gate } = useRequireAuth();
  const { data: cart, isLoading: cartLoading } = useCart(Boolean(user));
  const { resolvedTheme } = usePreferences();
  // Render-critical data fetched as a query (cache-backed, remount-safe), enabled by a non-empty
  // cart — see usePaymentIntent. No effects/refs, so client navigation and refresh behave identically.
  const intent = usePaymentIntent(cart);

  const options: StripeElementsOptions | null = useMemo(() => {
    if (!intent.data) return null;
    return { clientSecret: intent.data.clientSecret, appearance: appearanceFor(resolvedTheme) };
  }, [intent.data, resolvedTheme]);

  if (gate) return <Shell>{gate}</Shell>;

  if (cartLoading) {
    return <Shell><CheckoutSkeleton /></Shell>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Shell>
        <EmptyState
          icon={<Icon name="cart" size={28} />}
          title="Your cart is empty"
          description="Add something before checking out."
          action={<Link href="/products"><Button>Browse the catalog</Button></Link>}
        />
      </Shell>
    );
  }

  if (!stripePromise) {
    return (
      <Shell>
        <ErrorState
          message="Payments aren’t configured in this environment (missing Stripe publishable key)."
        />
      </Shell>
    );
  }

  if (intent.isError) {
    const message =
      intent.error instanceof ApiError
        ? intent.error.message
        : 'We couldn’t start checkout. Please try again.';
    return (
      <Shell>
        <ErrorState message={message} onRetry={() => void intent.refetch()} />
      </Shell>
    );
  }

  return (
    <Shell>
      {options && intent.data ? (
        // No `key` on Elements: react-stripe-js updates the appearance live when the theme changes,
        // so toggling dark/light never remounts the Payment Element (which would drop card input).
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm
            cart={cart}
            paymentIntentId={intent.data.paymentIntentId}
            amountCents={intent.data.amountCents}
          />
        </Elements>
      ) : (
        <CheckoutSkeleton />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-8">
      <div className="pp-rise mb-6">
        <Breadcrumbs
          items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]}
          className="mb-3"
        />
        <h1 className="font-serif text-[32px] font-medium tracking-tight text-ink">Checkout</h1>
        <p className="mt-1.5 text-muted">Complete your order — securely, without leaving the site.</p>
      </div>
      {children}
    </Container>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-9 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="flex flex-col">
        <div className="mx-auto mb-9 flex w-full max-w-[520px] items-center justify-between">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-7">
          <Skeleton className="mb-6 h-7 w-52" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-11 w-full" />
            ))}
          </div>
        </div>
        <Skeleton className="mt-6 h-[50px] w-full rounded-xl" />
      </div>
      <Skeleton className="h-96 w-full rounded-[22px]" />
    </div>
  );
}

