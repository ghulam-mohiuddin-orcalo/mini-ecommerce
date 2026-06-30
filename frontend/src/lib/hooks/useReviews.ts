import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/lib/api';
import type { FeaturedReview, Paginated, Review } from '@/lib/types';

/** Top-rated recent reviews across the catalog — for the home testimonials band. */
export function useFeaturedReviews(limit = 6) {
  return useQuery({
    queryKey: ['reviews', 'featured', limit],
    queryFn: () => apiFetch<FeaturedReview[]>(`/reviews/featured${toQueryString({ limit })}`),
    staleTime: 5 * 60 * 1000,
  });
}

/** Paginated reviews for a product (public). */
export function useReviews(productId: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['reviews', productId, page, pageSize],
    queryFn: () =>
      apiFetch<Paginated<Review>>(
        `/products/${productId}/reviews${toQueryString({ page, pageSize })}`,
      ),
    enabled: Boolean(productId),
    placeholderData: (prev) => prev,
  });
}

export interface CreateReviewInput {
  rating: number;
  title?: string;
  body: string;
}

/**
 * Submit a review. Eligibility (verified purchase) is enforced server-side — a 403 surfaces as
 * an ApiError the form renders. On success we refresh the reviews list and the product (its
 * ratingAvg/ratingCount are server-aggregated).
 */
export function useCreateReview(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) =>
      apiFetch<Review>(`/products/${productId}/reviews`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reviews', productId] });
      void qc.invalidateQueries({ queryKey: ['product', productId] });
    },
  });
}

export function useDeleteReview(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) =>
      apiFetch<void>(`/reviews/${reviewId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reviews', productId] });
      void qc.invalidateQueries({ queryKey: ['product', productId] });
    },
  });
}
