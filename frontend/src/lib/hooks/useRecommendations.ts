import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Recommendations } from '@/lib/types';

/**
 * Personalized suggestions (purchase history → cart → top sellers). Keyed on the signed-in
 * user so the cache refreshes after login/logout — and after a new purchase, since the orders
 * mutation invalidates this query.
 */
export function useRecommendations(userId: string | null) {
  return useQuery({
    queryKey: ['recommendations', userId ?? 'guest'],
    queryFn: () => apiFetch<Recommendations>('/recommendations'),
  });
}

/** "You might also like" — related products in the same category as the given product. */
export function useRelatedProducts(productId: string) {
  return useQuery({
    queryKey: ['recommendations', 'related', productId],
    queryFn: () => apiFetch<Recommendations>(`/recommendations/related/${productId}`),
    enabled: Boolean(productId),
  });
}
