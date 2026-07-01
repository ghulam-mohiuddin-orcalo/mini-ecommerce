import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/lib/api';
import type {
  AdminOrder,
  AdminProduct,
  Analytics,
  OrderStatus,
  Paginated2,
} from '@/lib/types';

export function useAnalytics(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => apiFetch<Analytics>('/admin/analytics'),
    enabled,
  });
}

// --- products ---------------------------------------------------------------------

export function useAdminProducts(params: { search?: string; page?: number }, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'products', params],
    queryFn: () =>
      apiFetch<Paginated2<AdminProduct>>(
        `/admin/products${toQueryString({ search: params.search, page: params.page })}`,
      ),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export interface ProductImageInput {
  url: string;
  alt?: string;
}

export interface ProductVariantInput {
  label: string;
  color?: string;
  size?: string;
  priceCents: number;
  stock: number;
  sku: string;
  position?: number;
  isActive?: boolean;
}

export interface ProductInput {
  sku?: string;
  name: string;
  description: string;
  priceCents: number;
  compareAtPriceCents?: number | null;
  imageUrl: string;
  categoryId: string;
  stock: number;
  images?: ProductImageInput[];
  variants?: ProductVariantInput[];
}

function useInvalidateProducts() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    void qc.invalidateQueries({ queryKey: ['products'] });
    void qc.invalidateQueries({ queryKey: ['categories'] });
  };
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: (body: ProductInput) =>
      apiFetch<AdminProduct>('/admin/products', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ProductInput> }) =>
      apiFetch<AdminProduct>(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useSetProductActive() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiFetch<AdminProduct>(`/admin/products/${id}/${active ? 'reactivate' : 'deactivate'}`, {
        method: 'PATCH',
      }),
    onSuccess: invalidate,
  });
}

// --- orders -----------------------------------------------------------------------

export function useAdminOrders(
  params: { status?: string; search?: string; page?: number },
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['admin', 'orders', params],
    queryFn: () =>
      apiFetch<Paginated2<AdminOrder>>(
        `/admin/orders${toQueryString({ status: params.status, search: params.search, page: params.page })}`,
      ),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      apiFetch<AdminOrder>(`/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
  });
}
