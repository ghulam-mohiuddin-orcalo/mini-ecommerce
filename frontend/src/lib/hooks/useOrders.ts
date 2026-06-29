import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Order } from '@/lib/types';

/** Documented mock token that forces a declined payment (matches the backend). */
export const MOCK_DECLINE_TOKEN = 'tok_decline';

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { paymentToken?: string }) =>
      apiFetch<Order>('/orders', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      // Cart was cleared server-side; refresh cart + order history.
      void qc.invalidateQueries({ queryKey: ['cart'] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useMyOrders(enabled: boolean) {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => apiFetch<Order[]>('/orders'),
    enabled,
  });
}

export function useOrder(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => apiFetch<Order>(`/orders/${id}`),
    enabled: enabled && Boolean(id),
  });
}
