import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Wishlist } from '@/lib/types';

const WISHLIST_KEY = ['wishlist'] as const;

/**
 * The authenticated user's wishlist. Enabled only when signed in (the endpoint is auth-only),
 * and it syncs across devices because it lives server-side — never localStorage.
 */
export function useWishlist(enabled: boolean) {
  return useQuery({
    queryKey: WISHLIST_KEY,
    queryFn: () => apiFetch<Wishlist>('/wishlist'),
    enabled,
  });
}

/** A quick membership lookup derived from the cached wishlist (no extra request). */
export function useIsWishlisted(productId: string, enabled: boolean): boolean {
  const { data } = useWishlist(enabled);
  return Boolean(data?.items.some((item) => item.product.id === productId));
}

/**
 * Toggle a product in the wishlist with an optimistic heart. We flip the cached membership
 * immediately, then reconcile with the server's authoritative wishlist on success; on error we
 * roll back to the snapshot. The mutation is keyed by productId so concurrent toggles are safe.
 */
export function useToggleWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      apiFetch<{ wishlisted: boolean }>('/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: WISHLIST_KEY });
    },
  });
}

/** Remove a single product from the wishlist (used by the wishlist page). */
export function useRemoveFromWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      apiFetch<Wishlist>(`/wishlist/items/${productId}`, { method: 'DELETE' }),
    onSuccess: (wishlist) => qc.setQueryData(WISHLIST_KEY, wishlist),
  });
}
