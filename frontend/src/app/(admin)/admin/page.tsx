'use client';

import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pend',
  PROCESSING: 'Proc',
  SHIPPED: 'Ship',
  DELIVERED: 'Deliv',
  CANCELLED: 'Canc',
};
// Token references (var(--…)) so chart fills flip with the theme — SVG fill/stroke resolve
// these against live computed styles, no re-render needed.
const STATUS_FILL: Record<OrderStatus, string> = {
  PENDING: 'var(--color-warning)',
  PROCESSING: 'var(--color-brand-500)',
  SHIPPED: 'var(--color-brand-600)',
  DELIVERED: 'var(--color-brand-700)',
  CANCELLED: 'var(--color-chart-muted)',
};
const RANK_FILL = [
  'var(--color-brand-700)',
  'var(--color-brand-500)',
  'var(--color-brand-300)',
  'var(--color-chart-muted)',
];

export default function AdminDashboard() {
  const { data: user } = useMe();
  const { data, isLoading, isError, refetch } = useAnalytics(user?.role === 'ADMIN');

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  const chartData = STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABEL[s],
    count: data.ordersByStatus[s],
  }));

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Dashboard</h1>
        <p className="mt-1 text-[13px] text-muted">Store performance at a glance</p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <StatCard
          label="Total sales"
          value={formatPrice(data.totalSalesCents)}
          hint="Excludes cancelled"
          chip="bg-brand-100 text-brand-700 dark:text-brand-300"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          label="Total orders"
          value={String(data.totalOrders)}
          chip="bg-[var(--color-warning-soft)] text-[var(--color-warning-ink)]"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M4 4h16v4H4z" />
              <path d="M5 8v12h14V8" />
            </svg>
          }
        />
        <StatCard
          label="Pending"
          value={String(data.ordersByStatus.PENDING)}
          hint="Awaiting processing"
          chip="bg-[var(--color-warning-soft)] text-[var(--color-warning-ink)]"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.2fr_1fr]">
        <section id="analytics" className="scroll-mt-6 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 text-[15px] font-extrabold tracking-tight text-ink">Orders by status</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'var(--color-brand-50)' }}
                  contentStyle={{
                    borderRadius: 12,
                    background: 'var(--color-surface)',
                    color: 'var(--color-ink)',
                    border: '1px solid var(--color-line)',
                    boxShadow: 'var(--shadow-summary)',
                    fontSize: 13,
                  }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.status ?? ''}
                />
                <Bar dataKey="count" radius={[8, 8, 3, 3]}>
                  {chartData.map((d) => (
                    <Cell key={d.status} fill={STATUS_FILL[d.status]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 text-[15px] font-extrabold tracking-tight text-ink">Top-selling products</h2>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-muted">No sales yet.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {data.topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] text-[11px] font-bold text-white"
                    style={{ background: RANK_FILL[i] ?? RANK_FILL[RANK_FILL.length - 1] }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-ink">{p.productName}</span>
                  <span className="text-[13px] font-bold text-ink-soft">{p.unitsSold} sold</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-2 text-[15px] font-extrabold tracking-tight text-ink">Recent orders</h2>
        {data.recentOrders.length === 0 ? (
          <p className="text-sm text-muted">No orders yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--color-line-soft)]">
            {data.recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex flex-col">
                  <span className="font-bold text-ink">{o.customerName}</span>
                  <span className="text-xs text-muted">#{o.id.slice(-8)} · {formatDate(o.createdAt)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={o.status} />
                  <span className="font-extrabold text-ink">{formatPrice(o.totalCents)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  chip,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  chip: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-[18px] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-muted">{label}</p>
        <span className={`grid h-[30px] w-[30px] place-items-center rounded-[9px] ${chip}`} aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="mt-2.5 text-[28px] font-extrabold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1.5 text-xs font-medium text-faint">{hint}</p>}
    </div>
  );
}
