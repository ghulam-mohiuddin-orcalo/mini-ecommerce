'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { OrderStatusBadge } from '@/components/store/OrderStatusBadge';
import { RecommendationsSection } from '@/components/store/RecommendationsSection';
import { ApiError } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';
import { useMe } from '@/lib/hooks/useAuth';
import { useOrder } from '@/lib/hooks/useOrders';
import { useRecommendations } from '@/lib/hooks/useRecommendations';

function OrderDetail() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const justPlaced = searchParams.get('placed') === '1';
  const { data: user, isLoading: userLoading } = useMe();
  const { data: order, isLoading, isError, error, refetch } = useOrder(params.id, Boolean(user));
  const recs = useRecommendations(user?.id ?? null);

  const notFound = isError && error instanceof ApiError && error.status === 404;

  if (userLoading || (user && isLoading)) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!user) {
    return (
      <EmptyState
        title="Sign in to view this order"
        action={<Link href="/login"><Button>Sign in</Button></Link>}
      />
    );
  }
  if (notFound) {
    return (
      <EmptyState
        title="Order not found"
        description="It doesn’t exist or isn’t associated with your account."
        action={<Link href="/orders"><Button variant="secondary">Your orders</Button></Link>}
      />
    );
  }
  if (isError || !order) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {justPlaced && (
        <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <span
            aria-hidden="true"
            className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <div>
            <p className="font-bold text-brand-700 dark:text-brand-300">Order confirmed — thank you!</p>
            <p className="text-sm text-muted">Your payment was confirmed by Stripe. A summary is below.</p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-[28px] font-medium tracking-tight text-ink">
            Order #{order.id.slice(-8)}
          </h1>
          <p className="mt-1 text-sm text-muted">Placed {formatDate(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <ul className="flex flex-col divide-y divide-[var(--color-line-soft)] overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]">
        {order.items.map((item) => (
          <li key={item.productId} className="flex gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.productImageUrl}
              alt={item.productName}
              className="h-16 w-16 rounded-xl border border-line object-cover"
            />
            <div className="flex flex-1 flex-col justify-center">
              <span className="font-bold tracking-tight text-ink">{item.productName}</span>
              <span className="text-[13px] text-muted">
                {formatPrice(item.unitPriceCents)} × {item.quantity}
              </span>
            </div>
            <span className="self-center font-extrabold text-ink">{formatPrice(item.lineTotalCents)}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-[18px] shadow-[var(--shadow-card)]">
        <span className="text-base font-extrabold text-ink">Total</span>
        <span className="text-[22px] font-extrabold tracking-tight text-brand-700 dark:text-brand-300">
          {formatPrice(order.totalCents)}
        </span>
      </div>

      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-300 hover:underline"
      >
        ← All orders
      </Link>

      {justPlaced && (
        <div className="mt-8">
          <RecommendationsSection
            title="Recommended for you"
            products={recs.data?.items}
            isLoading={recs.isLoading}
          />
        </div>
      )}
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <OrderDetail />
      </Suspense>
    </div>
  );
}
