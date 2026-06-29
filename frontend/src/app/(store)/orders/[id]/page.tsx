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
        <div className="rounded-xl border border-[color:var(--color-success)]/30 bg-brand-50 p-4">
          <p className="font-medium text-[color:var(--color-success)]">✓ Order confirmed — thank you!</p>
          <p className="text-sm text-muted">A confirmation of your mock payment is below.</p>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Order #{order.id.slice(-8)}
          </h1>
          <p className="mt-1 text-sm text-muted">Placed {formatDate(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
        {order.items.map((item) => (
          <li key={item.productId} className="flex gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.productImageUrl}
              alt={item.productName}
              className="h-16 w-16 rounded-lg border border-line object-cover"
            />
            <div className="flex flex-1 flex-col">
              <span className="font-medium text-ink">{item.productName}</span>
              <span className="text-sm text-muted">
                {formatPrice(item.unitPriceCents)} × {item.quantity}
              </span>
            </div>
            <span className="font-semibold text-ink">{formatPrice(item.lineTotalCents)}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-4">
        <span className="text-lg font-semibold text-ink">Total</span>
        <span className="text-lg font-semibold text-brand-700">{formatPrice(order.totalCents)}</span>
      </div>

      <Link href="/orders" className="text-sm font-medium text-brand-700 hover:underline">
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
