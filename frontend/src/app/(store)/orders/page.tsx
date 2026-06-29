'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { OrderStatusBadge } from '@/components/store/OrderStatusBadge';
import { formatDate, formatPrice } from '@/lib/format';
import { useMe } from '@/lib/hooks/useAuth';
import { useMyOrders } from '@/lib/hooks/useOrders';

export default function OrdersPage() {
  const { data: user, isLoading: userLoading } = useMe();
  const { data: orders, isLoading, isError, refetch } = useMyOrders(Boolean(user));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-ink">Your orders</h1>

      {userLoading || isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !user ? (
        <EmptyState
          title="Sign in to view your orders"
          action={<Link href="/login"><Button>Sign in</Button></Link>}
        />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="When you place an order it will appear here."
          action={<Link href="/products"><Button>Browse the catalog</Button></Link>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex items-center justify-between rounded-xl border border-line bg-surface p-[18px] shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-bold tracking-tight text-ink">Order #{order.id.slice(-8)}</span>
                  <span className="text-[13px] text-muted">
                    {formatDate(order.createdAt)} ·{' '}
                    {order.items.reduce((n, i) => n + i.quantity, 0)} item(s)
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={order.status} />
                  <span className="font-extrabold text-ink">{formatPrice(order.totalCents)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
