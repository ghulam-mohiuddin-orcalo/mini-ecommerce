import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/lib/api';
import type { Category, CreateCategoryInput, Paginated2, UpdateCategoryInput } from '@/lib/types';

export type AdminCategoryStatus = 'active' | 'inactive';

export type AdminCategorySort =
  | 'name_asc'
  | 'name_desc'
  | 'created_asc'
  | 'created_desc'
  | 'sortOrder_asc'
  | 'products_desc';

export interface AdminCategoryQuery {
  search?: string;
  status?: AdminCategoryStatus | '';
  sort?: AdminCategorySort;
  page?: number;
  pageSize?: number;
}

const ADMIN_CATEGORIES_KEY = ['admin', 'categories'] as const;

export function useAdminCategories(query: AdminCategoryQuery, enabled: boolean) {
  return useQuery({
    queryKey: [...ADMIN_CATEGORIES_KEY, query],
    queryFn: () =>
      apiFetch<Paginated2<Category>>(
        `/admin/categories${toQueryString({
          search: query.search,
          status: query.status || undefined,
          sort: query.sort,
          page: query.page,
          pageSize: query.pageSize,
        })}`,
      ),
    enabled,
    placeholderData: (prev) => prev,
  });
}

/**
 * Flat list of every category (all statuses), for pickers like the product form's
 * category select. Fetches a single large page and returns the `data` array.
 */
export function useAllAdminCategories(enabled: boolean) {
  return useQuery({
    queryKey: [...ADMIN_CATEGORIES_KEY, 'all'],
    queryFn: async () => {
      const res = await apiFetch<Paginated2<Category>>(
        `/admin/categories${toQueryString({ pageSize: 200, sort: 'name_asc' })}`,
      );
      return res.data;
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useAdminCategory(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'category', id],
    queryFn: () => apiFetch<Category>(`/admin/categories/${id}`),
    enabled: enabled && Boolean(id),
  });
}

function useInvalidateCategories() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY });
    // Public storefront categories (grid, filters, header, footer) also change on any write.
    void qc.invalidateQueries({ queryKey: ['categories'] });
  };
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (body: CreateCategoryInput) =>
      apiFetch<Category>('/admin/categories', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCategoryInput }) =>
      apiFetch<Category>(`/admin/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

export function useActivateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Category>(`/admin/categories/${id}/activate`, { method: 'PATCH' }),
    onSuccess: invalidate,
  });
}

export function useDeactivateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Category>(`/admin/categories/${id}/deactivate`, { method: 'PATCH' }),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    // 409 (products still assigned) surfaces as an ApiError with the backend message.
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/admin/categories/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
