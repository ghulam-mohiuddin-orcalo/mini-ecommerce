import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Cart } from '@/lib/types';

/**
 * Cart query. Enabled only when authenticated (the endpoint is auth-only). Every mutation
 * returns the server-recomputed cart, which we write straight into the cache — correctness
 * without optimistic guesswork (the server is the source of truth for stock and totals).
 */
export function useCart(enabled: boolean) {
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => apiFetch<Cart>('/cart'),
    enabled,
  });
}

function useCartMutation<TArgs>(fn: (args: TArgs) => Promise<Cart>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart) => qc.setQueryData(['cart'], cart),
  });
}

export function useAddToCart() {
  return useCartMutation((body: { productId: string; quantity: number }) =>
    apiFetch<Cart>('/cart/items', { method: 'POST', body: JSON.stringify(body) }),
  );
}

export function useUpdateCartItem() {
  return useCartMutation(({ productId, quantity }: { productId: string; quantity: number }) =>
    apiFetch<Cart>(`/cart/items/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),
  );
}

export function useRemoveCartItem() {
  return useCartMutation((productId: string) =>
    apiFetch<Cart>(`/cart/items/${productId}`, { method: 'DELETE' }),
  );
}

export function useClearCart() {
  return useCartMutation<void>(() => apiFetch<Cart>('/cart', { method: 'DELETE' }));
}
