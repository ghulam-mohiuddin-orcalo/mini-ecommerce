'use client';

import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Pagination } from '@/components/store/Pagination';
import { OrderStatusBadge } from '@/components/store/OrderStatusBadge';
import { formatDate, formatPrice } from '@/lib/format';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useMe } from '@/lib/hooks/useAuth';
import { useAdminOrders, useUpdateOrderStatus } from '@/lib/hooks/useAdmin';
import { ALLOWED_TRANSITIONS, TRANSITION_LABEL } from '@/lib/orderTransitions';
import { cn } from '@/lib/cn';
import type { AdminOrder, OrderStatus } from '@/lib/types';

const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

export default function AdminOrdersPage() {
  const { data: user } = useMe();
  const isAdmin = user?.role === 'ADMIN';

  const [status, setStatus] = useState<'' | OrderStatus>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useAdminOrders(
    { status: status || undefined, search: debouncedSearch || undefined, page },
    isAdmin,
  );

  const setFilter = (next: '' | OrderStatus) => {
    setStatus(next);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Orders</h1>
        {data?.meta && (
          <p className="mt-1 text-[13px] text-muted">
            {data.meta.total} order{data.meta.total === 1 ? '' : 's'}
            {status ? ' (filtered)' : ' total'}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter orders by status">
        <FilterTab label="All" active={status === ''} onClick={() => setFilter('')} />
        {STATUS_OPTIONS.map((s) => (
          <FilterTab
            key={s}
            label={s.charAt(0) + s.slice(1).toLowerCase()}
            active={status === s}
            onClick={() => setFilter(s)}
          />
        ))}
      </div>

      <Input
        type="search"
        placeholder="Search by customer name or email…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm"
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No orders" description="No orders match the current filters." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-2 text-left text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
                  <th className="px-[18px] py-3 font-bold">Order</th>
                  <th className="px-[18px] py-3 font-bold">Customer</th>
                  <th className="px-[18px] py-3 font-bold">Date</th>
                  <th className="px-[18px] py-3 font-bold">Total</th>
                  <th className="px-[18px] py-3 font-bold">Status</th>
                  <th className="px-[18px] py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line-soft)]">
                {data.data.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </tbody>
            </table>
          </div>
          {data.meta.totalPages > 1 && (
            <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />
          )}
        </div>
      )}
    </div>
  );
}

function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
        active
          ? 'bg-brand-600 text-white'
          : 'border border-line bg-surface text-ink-soft hover:bg-paper-2',
      )}
    >
      {label}
    </button>
  );
}

function initialsOf(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function OrderRow({ order }: { order: AdminOrder }) {
  const [open, setOpen] = useState(false);
  const updateStatus = useUpdateOrderStatus();
  const transitions = ALLOWED_TRANSITIONS[order.status];
  const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0);

  const onTransition = (next: OrderStatus) => {
    if (next === 'CANCELLED' && !window.confirm('Cancel this order? Its items will be restocked.')) {
      return;
    }
    updateStatus.mutate({ id: order.id, status: next });
  };

  return (
    <Fragment>
      <tr className="align-top transition-colors hover:bg-paper-2">
        <td className="px-[18px] py-3">
          <button
            onClick={() => setOpen((v) => !v)}
            className="font-bold tabular-nums text-brand-700 dark:text-brand-300 hover:underline"
            aria-expanded={open}
          >
            #{order.id.slice(-8)}
          </button>
          <div className="text-xs text-muted">
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </div>
        </td>
        <td className="px-[18px] py-3">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700 dark:text-brand-300"
            >
              {initialsOf(order.customer.name)}
            </span>
            <div className="leading-tight">
              <div className="font-bold text-ink">{order.customer.name}</div>
              <div className="text-xs text-muted">{order.customer.email}</div>
            </div>
          </div>
        </td>
        <td className="px-[18px] py-3 text-ink-soft">{formatDate(order.createdAt)}</td>
        <td className="px-[18px] py-3 font-extrabold tabular-nums text-ink">{formatPrice(order.totalCents)}</td>
        <td className="px-[18px] py-3">
          <OrderStatusBadge status={order.status} />
        </td>
        <td className="px-[18px] py-3">
          {transitions.length === 0 ? (
            <span className="text-xs text-muted">No actions</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {transitions.map((next) => (
                <Button
                  key={next}
                  size="sm"
                  variant={next === 'CANCELLED' ? 'ghost' : 'secondary'}
                  disabled={updateStatus.isPending}
                  onClick={() => onTransition(next)}
                >
                  {TRANSITION_LABEL[next]}
                </Button>
              ))}
            </div>
          )}
        </td>
      </tr>
      {open && (
        <tr className="bg-paper-2/60">
          <td colSpan={6} className="px-[18px] py-3">
            <ul className="flex flex-col divide-y divide-[var(--color-line-soft)]">
              {order.items.map((it) => (
                <li key={it.productId} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.productImageUrl}
                      alt=""
                      className="h-9 w-9 rounded-[9px] border border-line object-cover"
                    />
                    <span className="font-semibold text-ink">{it.productName}</span>
                  </div>
                  <span className="text-muted">
                    {it.quantity} × {formatPrice(it.unitPriceCents)} ={' '}
                    <span className="font-bold text-ink">{formatPrice(it.lineTotalCents)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
