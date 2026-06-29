'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Pagination } from '@/components/store/Pagination';
import { AdminProductForm } from '@/components/admin/AdminProductForm';
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Products</h1>
        {!creating && !editing && <Button onClick={() => setCreating(true)}>Add product</Button>}
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
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-muted">
                <tr>
                  <th className="p-3 font-medium">Product</th>
                  <th className="p-3 font-medium">SKU</th>
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium">Price</th>
                  <th className="p-3 font-medium">Stock</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.map((p) => (
                  <tr key={p.id} className={p.isActive ? '' : 'opacity-60'}>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imageUrl} alt="" className="h-10 w-10 rounded-md border border-line object-cover" />
                        <span className="font-medium text-ink">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted">{p.sku}</td>
                    <td className="p-3 text-muted">{p.category}</td>
                    <td className="p-3 text-ink">{formatPrice(p.priceCents)}</td>
                    <td className="p-3 text-ink">{p.stock}</td>
                    <td className="p-3">
                      <Badge tone={p.isActive ? 'brand' : 'danger'}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditing(p);
                            setCreating(false);
                          }}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setActive.mutate({ id: p.id, active: !p.isActive })}
                          disabled={setActive.isPending}
                          className="font-medium text-muted hover:text-ink"
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
