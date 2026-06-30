'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Pagination } from '@/components/store/Pagination';
import { AdminProductForm } from '@/components/admin/AdminProductForm';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useMe } from '@/lib/hooks/useAuth';
import { useAdminProducts, useSetProductActive } from '@/lib/hooks/useAdmin';
import type { AdminProduct } from '@/lib/types';

export default function AdminProductsPage() {
  const { data: user } = useMe();
  const isAdmin = user?.role === 'ADMIN';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);
  const { data, isLoading, isError, refetch } = useAdminProducts(
    { search: debouncedSearch || undefined, page },
    isAdmin,
  );
  const setActive = useSetProductActive();

  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const closeForm = () => {
    setEditing(null);
    setCreating(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Products</h1>
          {data?.meta && (
            <p className="mt-1 text-[13px] text-muted">
              {data.meta.total} item{data.meta.total === 1 ? '' : 's'}
            </p>
          )}
        </div>
        {!creating && !editing && (
          <Button onClick={() => setCreating(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add product
          </Button>
        )}
      </div>

      {(creating || editing) && (
        <AdminProductForm product={editing ?? undefined} onDone={closeForm} />
      )}

      <Input
        type="search"
        placeholder="Search products…"
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
        <EmptyState title="No products" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-2 text-left text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
                  <th className="px-[18px] py-3 font-bold">Product</th>
                  <th className="px-[18px] py-3 font-bold">SKU</th>
                  <th className="px-[18px] py-3 font-bold">Category</th>
                  <th className="px-[18px] py-3 font-bold">Price</th>
                  <th className="px-[18px] py-3 font-bold">Stock</th>
                  <th className="px-[18px] py-3 font-bold">Status</th>
                  <th className="px-[18px] py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line-soft)]">
                {data.data.map((p) => (
                  <tr
                    key={p.id}
                    className={cn('transition-colors hover:bg-paper-2', !p.isActive && 'opacity-55')}
                  >
                    <td className="px-[18px] py-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imageUrl} alt="" className="h-[38px] w-[38px] rounded-[9px] border border-line object-cover" />
                        <span className="font-bold text-ink">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-[18px] py-3 tabular-nums text-muted">{p.sku}</td>
                    <td className="px-[18px] py-3 text-ink-soft">{p.category}</td>
                    <td className="px-[18px] py-3 font-bold tabular-nums text-ink">{formatPrice(p.priceCents)}</td>
                    <td className="px-[18px] py-3 font-semibold tabular-nums text-ink">{p.stock}</td>
                    <td className="px-[18px] py-3">
                      <Badge tone={p.isActive ? 'brand' : 'neutral'} dot>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-[18px] py-3">
                      <div className="flex justify-end gap-3.5 font-semibold">
                        <button
                          onClick={() => {
                            setEditing(p);
                            setCreating(false);
                          }}
                          className="text-brand-600 dark:text-brand-300 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setActive.mutate({ id: p.id, active: !p.isActive })}
                          disabled={setActive.isPending}
                          className="text-muted hover:text-ink"
                        >
                          {p.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
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
