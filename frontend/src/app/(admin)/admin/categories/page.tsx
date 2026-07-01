'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { Pagination } from '@/components/store/Pagination';
import { AdminCategoryForm } from '@/components/admin/AdminCategoryForm';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useMe } from '@/lib/hooks/useAuth';
import {
  useActivateCategory,
  useAdminCategories,
  useDeactivateCategory,
  useDeleteCategory,
  type AdminCategorySort,
  type AdminCategoryStatus,
} from '@/lib/hooks/useAdminCategories';
import type { Category } from '@/lib/types';

const STATUS_OPTIONS: { value: '' | AdminCategoryStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const SORT_OPTIONS: { value: AdminCategorySort; label: string }[] = [
  { value: 'sortOrder_asc', label: 'Sort order' },
  { value: 'name_asc', label: 'Name (A–Z)' },
  { value: 'name_desc', label: 'Name (Z–A)' },
  { value: 'created_desc', label: 'Newest' },
  { value: 'created_asc', label: 'Oldest' },
  { value: 'products_desc', label: 'Most products' },
];

export default function AdminCategoriesPage() {
  const { data: user } = useMe();
  const isAdmin = user?.role === 'ADMIN';
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | AdminCategoryStatus>('');
  const [sort, setSort] = useState<AdminCategorySort>('sortOrder_asc');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useAdminCategories(
    { search: debouncedSearch || undefined, status, sort, page },
    isAdmin,
  );

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const closeForm = () => {
    setEditing(null);
    setCreating(false);
  };

  const activate = useActivateCategory();
  const deactivate = useDeactivateCategory();
  const remove = useDeleteCategory();

  const onToggleActive = (c: Category) => {
    const mutation = c.isActive ? deactivate : activate;
    mutation.mutate(c.id, {
      onSuccess: () =>
        toast({
          variant: 'success',
          title: c.isActive ? 'Category deactivated' : 'Category activated',
        }),
      onError: (e) =>
        toast({
          variant: 'error',
          title: 'Action failed',
          description: e instanceof ApiError ? e.message : undefined,
        }),
    });
  };

  const onDelete = (c: Category) => {
    if (!window.confirm(`Delete “${c.name}”? This cannot be undone.`)) return;
    remove.mutate(c.id, {
      onSuccess: () => toast({ variant: 'success', title: 'Category deleted' }),
      // Surfaces the backend 409 ("Cannot delete a category that still has products…").
      onError: (e) =>
        toast({
          variant: 'error',
          title: 'Delete failed',
          description:
            e instanceof ApiError ? e.message : 'Could not delete this category.',
        }),
    });
  };

  const togglePending = activate.isPending || deactivate.isPending;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Categories</h1>
          {data?.meta && (
            <p className="mt-1 text-[13px] text-muted">
              {data.meta.total} categor{data.meta.total === 1 ? 'y' : 'ies'}
            </p>
          )}
        </div>
        {!creating && !editing && (
          <Button onClick={() => setCreating(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New category
          </Button>
        )}
      </div>

      {(creating || editing) && (
        <AdminCategoryForm
          key={editing?.id ?? 'new'}
          category={editing ?? undefined}
          onDone={() => {
            toast({
              variant: 'success',
              title: editing ? 'Category saved' : 'Category created',
            });
            closeForm();
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Search categories…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as '' | AdminCategoryStatus);
            setPage(1);
          }}
          aria-label="Filter by status"
          className="max-w-[180px]"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as AdminCategorySort);
            setPage(1);
          }}
          aria-label="Sort categories"
          className="max-w-[180px]"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No categories" description="No categories match the current filters." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-2 text-left text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
                  <th className="px-[18px] py-3 font-bold">Name</th>
                  <th className="px-[18px] py-3 font-bold">Slug</th>
                  <th className="px-[18px] py-3 font-bold">Products</th>
                  <th className="px-[18px] py-3 font-bold">Status</th>
                  <th className="px-[18px] py-3 font-bold">Created</th>
                  <th className="px-[18px] py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line-soft)]">
                {data.data.map((c) => (
                  <tr
                    key={c.id}
                    className={cn('align-top transition-colors hover:bg-paper-2', !c.isActive && 'opacity-55')}
                  >
                    <td className="px-[18px] py-3">
                      <div className="font-bold text-ink">{c.name}</div>
                      {c.description && (
                        <div className="line-clamp-1 text-xs text-muted">{c.description}</div>
                      )}
                    </td>
                    <td className="px-[18px] py-3 font-mono text-xs text-ink-soft">{c.slug}</td>
                    <td className="px-[18px] py-3 tabular-nums text-ink-soft">{c.productCount}</td>
                    <td className="px-[18px] py-3">
                      <Badge tone={c.isActive ? 'brand' : 'neutral'} dot>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-[18px] py-3 text-ink-soft">{formatDate(c.createdAt)}</td>
                    <td className="px-[18px] py-3">
                      <div className="flex justify-end gap-3.5 font-semibold">
                        <button
                          onClick={() => {
                            setEditing(c);
                            setCreating(false);
                          }}
                          className="text-brand-600 hover:underline dark:text-brand-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onToggleActive(c)}
                          disabled={togglePending}
                          className="text-muted hover:text-ink"
                        >
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => onDelete(c)}
                          disabled={remove.isPending}
                          className="text-[color:var(--color-danger)] hover:underline"
                        >
                          Delete
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
