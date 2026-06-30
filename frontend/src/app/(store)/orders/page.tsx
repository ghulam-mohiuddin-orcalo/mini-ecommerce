'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Icon } from '@/components/ui/Icon';
import { OrderStatusBadge } from '@/components/store/OrderStatusBadge';
import { formatDate, formatPrice } from '@/lib/format';
import { useMe } from '@/lib/hooks/useAuth';
import { useMyOrders } from '@/lib/hooks/useOrders';
import type { Order } from '@/lib/types';

const MAX_THUMBS = 4;

export default function OrdersPage() {
  const { data: user, isLoading: userLoading } = useMe();
  const { data: orders, isLoading, isError, refetch } = useMyOrders(Boolean(user));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="pp-rise mb-6">
        <h1 className="font-serif text-[32px] font-medium tracking-tight text-ink">Your orders</h1>
        <p className="mt-1.5 text-muted">Track current orders and revisit past purchases.</p>
      </div>

      {userLoading || (user && isLoading) ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : !user ? (
        <EmptyState
          icon={<Icon name="bag" size={28} />}
          title="Sign in to view your orders"
          description="Your order history and tracking live here."
          action={<Link href="/login"><Button>Sign in</Button></Link>}
        />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          icon={<Icon name="bag" size={28} />}
          title="No orders yet"
          description="When you place an order it will appear here."
          action={<Link href="/products"><Button>Browse the catalog</Button></Link>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
  const thumbs = order.items.slice(0, MAX_THUMBS);
  const extra = order.items.length - thumbs.length;

  return (
    <Link
      href={`/orders/${order.id}`}
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-[18px] shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="flex -space-x-3">
          {thumbs.map((item, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${item.productId}-${item.variantId ?? i}`}
              src={item.productImageUrl}
              alt={item.productName}
              className="h-12 w-12 rounded-lg border-2 border-surface object-cover shadow-sm"
            />
          ))}
          {extra > 0 && (
            <span className="grid h-12 w-12 place-items-center rounded-lg border-2 border-surface bg-paper-2 text-xs font-bold text-ink-soft">
              +{extra}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-bold tracking-tight text-ink">Order #{order.id.slice(-8)}</span>
          <span className="text-[13px] text-muted">
            {formatDate(order.createdAt)} · {itemCount} item{itemCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <OrderStatusBadge status={order.status} />
        <span className="font-extrabold tabular-nums text-ink">{formatPrice(order.totalCents)}</span>
        <Icon name="chevron-right" size={16} className="hidden text-faint sm:block" />
      </div>
    </Link>
  );
}
