'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { OrderStatusBadge } from '@/components/store/OrderStatusBadge';
import { formatDate, formatPrice } from '@/lib/format';
import { useMe } from '@/lib/hooks/useAuth';
import { useAnalytics } from '@/lib/hooks/useAdmin';
import type { OrderStatus } from '@/lib/types';

const STATUS_ORDER: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function AdminDashboard() {
  const { data: user } = useMe();
  const { data, isLoading, isError, refetch } = useAnalytics(user?.role === 'ADMIN');

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  const chartData = STATUS_ORDER.map((s) => ({ status: s.slice(0, 4), count: data.ordersByStatus[s] }));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total sales" value={formatPrice(data.totalSalesCents)} hint="Excludes cancelled" />
        <StatCard label="Total orders" value={String(data.totalOrders)} />
        <StatCard label="Pending" value={String(data.ordersByStatus.PENDING)} hint="Awaiting processing" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 text-lg font-semibold text-ink">Orders by status</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dd" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#6f6b66' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6f6b66' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f0f6f3' }} />
                <Bar dataKey="count" fill="#2c5d4a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 text-lg font-semibold text-ink">Top-selling products</h2>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-muted">No sales yet.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {data.topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center justify-between text-sm">
                  <span className="text-ink">
                    <span className="mr-2 text-muted">{i + 1}.</span>
                    {p.productName}
                  </span>
                  <span className="font-medium text-ink">{p.unitsSold} sold</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-lg font-semibold text-ink">Recent orders</h2>
        {data.recentOrders.length === 0 ? (
          <p className="text-sm text-muted">No orders yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {data.recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium text-ink">{o.customerName}</span>
                  <span className="text-muted">#{o.id.slice(-8)} · {formatDate(o.createdAt)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={o.status} />
                  <span className="font-semibold text-ink">{formatPrice(o.totalCents)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
