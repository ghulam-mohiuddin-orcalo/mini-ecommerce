'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Container } from '@/components/store/Container';
import { usePaymentIntentStatus, useSessionStatus } from '@/lib/hooks/usePayments';

/**
 * Payment success return page. Reached two ways:
 *  - embedded Payment Element after a redirect-based step (e.g. 3-D Secure): ?payment_intent=pi_…
 *  - legacy hosted Checkout: ?session_id=cs_…
 * Either way we poll the backend until the order is fulfilled (webhook or direct reconciliation),
 * then forward to the order confirmation page. The order is only ever created after Stripe confirms
 * payment, so this page never creates one itself — it just waits and redirects.
 */
function CheckoutSuccess() {
  const router = useRouter();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const paymentIntentId = searchParams.get('payment_intent');

  // Exactly one id is present per visit; the other hook stays disabled (null id).
  const sessionStatus = useSessionStatus(sessionId);
  const intentStatus = usePaymentIntentStatus(paymentIntentId);
  const active = paymentIntentId ? intentStatus : sessionStatus;
  const { data, isError, refetch } = active;
  const hasReference = Boolean(sessionId || paymentIntentId);

  useEffect(() => {
    if (data?.status === 'complete' && data.orderId) {
      // The cart was cleared and a purchase recorded server-side — refresh the affected caches
      // before landing on the confirmation page.
      void qc.invalidateQueries({ queryKey: ['cart'] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
      void qc.invalidateQueries({ queryKey: ['recommendations'] });
      router.replace(`/orders/${data.orderId}?placed=1`);
    }
  }, [data, qc, router]);

  if (!hasReference) {
    return (
      <EmptyState
        icon={<Icon name="info" size={28} />}
        title="Missing payment reference"
        description="This page should be reached from the checkout payment step."
        action={<Link href="/cart"><Button>Back to cart</Button></Link>}
      />
    );
  }

  if (isError) {
    return <ErrorState message="We couldn’t confirm your payment status." onRetry={() => void refetch()} />;
  }

  if (data?.status === 'expired') {
    return (
      <EmptyState
        icon={<Icon name="x-circle" size={28} />}
        title="This payment didn’t complete"
        description="No order was placed. You can start over from your cart."
        action={<Link href="/cart"><Button>Back to cart</Button></Link>}
      />
    );
  }

  // complete → the effect above redirects to the order page; show a celebratory hand-off so the
  // brief window before navigation never flashes the "confirming" spinner.
  if (data?.status === 'complete') {
    return (
      <div className="pp-rise flex flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)]">
        <span
          aria-hidden="true"
          className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-success ring-1 ring-brand-200"
        >
          <Icon name="check-circle" size={32} />
        </span>
        <p className="font-serif text-[26px] font-medium tracking-tight text-ink">Payment confirmed</p>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          Thank you — your order is placed. Taking you to your confirmation…
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/orders"><Button>View my orders</Button></Link>
          <Link href="/products"><Button variant="secondary">Continue shopping</Button></Link>
        </div>
      </div>
    );
  }

  // pending / not-yet-fulfilled → keep waiting (the status hook polls in the background).
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)]">
      <span
        aria-hidden="true"
        className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600 motion-reduce:animate-none"
      />
      <p className="text-base font-extrabold tracking-tight text-ink">Confirming your payment…</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        Hang tight — we’re finalizing your order. This usually takes a moment.
      </p>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Container width="narrow" className="py-8">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <CheckoutSuccess />
      </Suspense>
    </Container>
  );
}
