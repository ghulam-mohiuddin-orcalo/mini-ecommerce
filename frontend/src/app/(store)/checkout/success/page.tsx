'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useSessionStatus } from '@/lib/hooks/usePayments';

/**
 * Stripe Checkout success return page. Stripe redirects here with ?session_id=… after payment.
 * We poll the backend until the order is fulfilled (webhook or direct reconciliation), then
 * forward to the existing order confirmation page. The order is only ever created after Stripe
 * confirms payment, so this page never creates one itself — it just waits and redirects.
 */
function CheckoutSuccess() {
  const router = useRouter();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const { data, isError, refetch } = useSessionStatus(sessionId);

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

  if (!sessionId) {
    return (
      <EmptyState
        title="Missing checkout session"
        description="This page should be reached from Stripe Checkout."
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
        title="This checkout session expired"
        description="No payment was taken. You can start over from your cart."
        action={<Link href="/cart"><Button>Back to cart</Button></Link>}
      />
    );
  }

  // pending / not-yet-fulfilled → keep waiting (useSessionStatus polls in the background).
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)]">
      <span
        aria-hidden="true"
        className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-200 border-t-brand-600"
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <CheckoutSuccess />
      </Suspense>
    </div>
  );
}
