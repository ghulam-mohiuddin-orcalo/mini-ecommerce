'use client';

import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Pagination } from '@/components/store/Pagination';
import { OrderStatusBadge } from '@/components/store/OrderStatusBadge';
import { formatDate, formatPrice } from '@/lib/format';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useMe } from '@/lib/hooks/useAuth';
import { useAdminOrders, useUpdateOrderStatus } from '@/lib/hooks/useAdmin';
import { ALLOWED_TRANSITIONS, TRANSITION_LABEL } from '@/lib/orderTransitions';
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Orders</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as '' | OrderStatus);
            setPage(1);
          }}
          className="max-w-[12rem]"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
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
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No orders" description="No orders match the current filters." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-muted">
                <tr>
                  <th className="p-3 font-medium">Order</th>
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Total</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
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
      <tr className="align-top">
        <td className="p-3">
          <button
            onClick={() => setOpen((v) => !v)}
            className="font-medium text-brand-700 hover:underline"
            aria-expanded={open}
          >
            #{order.id.slice(-8)}
          </button>
          <div className="text-xs text-muted">
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </div>
        </td>
        <td className="p-3">
          <div className="font-medium text-ink">{order.customer.name}</div>
          <div className="text-xs text-muted">{order.customer.email}</div>
        </td>
        <td className="p-3 text-muted">{formatDate(order.createdAt)}</td>
        <td className="p-3 font-semibold text-ink">{formatPrice(order.totalCents)}</td>
        <td className="p-3">
          <OrderStatusBadge status={order.status} />
        </td>
        <td className="p-3">
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
        <tr className="bg-paper/60">
          <td colSpan={6} className="p-3">
            <ul className="flex flex-col divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.productId} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.productImageUrl}
                      alt=""
                      className="h-9 w-9 rounded-md border border-line object-cover"
                    />
                    <span className="text-ink">{it.productName}</span>
                  </div>
                  <span className="text-muted">
                    {it.quantity} × {formatPrice(it.unitPriceCents)} ={' '}
                    <span className="font-medium text-ink">{formatPrice(it.lineTotalCents)}</span>
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
