'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Icon } from '@/components/ui/Icon';
import { OrderStatusBadge } from '@/components/store/OrderStatusBadge';
import { OrderTimeline } from '@/components/store/OrderTimeline';
import { Container } from '@/components/store/Container';
import { RecommendationsSection } from '@/components/store/RecommendationsSection';
import { ApiError } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { useOrder } from '@/lib/hooks/useOrders';
import { useRecommendations } from '@/lib/hooks/useRecommendations';

function OrderDetail() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const justPlaced = searchParams.get('placed') === '1';
  const { user, gate } = useRequireAuth();
  const { data: order, isLoading, isError, error, refetch } = useOrder(params.id, Boolean(user));
  const recs = useRecommendations(user?.id ?? null);

  const notFound = isError && error instanceof ApiError && error.status === 404;

  if (gate) return gate;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }
  if (notFound) {
    return (
      <EmptyState
        icon={<Icon name="bag" size={28} />}
        title="Order not found"
        description="It doesn’t exist or isn’t associated with your account."
        action={<Link href="/orders"><Button variant="secondary">Your orders</Button></Link>}
      />
    );
  }
  if (isError || !order) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-300 hover:underline"
      >
        <Icon name="arrow-left" size={15} />
        All orders
      </Link>

      {justPlaced && (
        <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <span
            aria-hidden="true"
            className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-white"
          >
            <Icon name="check" size={14} />
          </span>
          <div>
            <p className="font-bold text-brand-700 dark:text-brand-300">Order confirmed — thank you!</p>
            <p className="text-sm text-muted">Your payment was confirmed. A summary is below.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-[28px] font-medium tracking-tight text-ink">
            Order #{order.id.slice(-8)}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Placed {formatDate(order.createdAt)} · {itemCount} item{itemCount === 1 ? '' : 's'}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Tracking timeline */}
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-5 text-xs font-bold uppercase tracking-[0.07em] text-muted">Tracking</h2>
        <OrderTimeline status={order.status} placedAt={order.createdAt} />
      </section>

      {/* Line items */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.07em] text-muted">Items</h2>
        <ul className="flex flex-col divide-y divide-[var(--color-line-soft)] overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
          {order.items.map((item, i) => (
            <li key={`${item.productId}-${item.variantId ?? i}`} className="flex gap-4 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.productImageUrl}
                alt={item.productName}
                className="h-16 w-16 shrink-0 rounded-xl border border-line object-cover"
              />
              <div className="flex flex-1 flex-col justify-center gap-0.5">
                <span className="font-bold tracking-tight text-ink">{item.productName}</span>
                {item.variantLabel && (
                  <span className="text-xs font-semibold text-muted">{item.variantLabel}</span>
                )}
                <span className="text-[13px] text-muted">
                  {formatPrice(item.unitPriceCents)} × {item.quantity}
                </span>
              </div>
              <span className="self-center font-extrabold tabular-nums text-ink">
                {formatPrice(item.lineTotalCents)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Summary + payment */}
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.07em] text-muted">Summary</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted">Items ({itemCount})</dt>
            <dd className="font-semibold tabular-nums text-ink">{formatPrice(order.totalCents)}</dd>
          </div>
          {order.paymentRef && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Payment reference</dt>
              <dd className="truncate font-mono text-xs text-ink-soft">{order.paymentRef}</dd>
            </div>
          )}
          {order.paidAt && (
            <div className="flex items-center justify-between">
              <dt className="text-muted">Paid on</dt>
              <dd className="font-semibold text-ink">{formatDate(order.paidAt)}</dd>
            </div>
          )}
        </dl>
        <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-4">
          <span className="text-base font-extrabold text-ink">Total</span>
          <span className="text-[22px] font-extrabold tracking-tight text-brand-700 dark:text-brand-300">
            {formatPrice(order.totalCents)}
          </span>
        </div>
      </section>

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
    <Container width="narrow" className="py-8">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <OrderDetail />
      </Suspense>
    </Container>
  );
}
