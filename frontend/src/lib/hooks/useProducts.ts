import { useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/lib/api';
import type { Paginated, Product, ProductQuery } from '@/lib/types';

export function useProducts(query: ProductQuery) {
  return useQuery({
    queryKey: ['products', query],
    queryFn: () =>
      apiFetch<Paginated<Product>>(
        `/products${toQueryString({
          search: query.search,
          category: query.category,
          minPrice: query.minPrice,
          maxPrice: query.maxPrice,
          minRating: query.minRating,
          sort: query.sort,
          page: query.page,
          pageSize: query.pageSize,
        })}`,
      ),
    placeholderData: (prev) => prev, // keep previous page visible while the next loads
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => apiFetch<Product>(`/products/${id}`),
    enabled: Boolean(id),
  });
}

export function useBestSellers(limit = 4, windowDays = 90) {
  return useQuery({
    queryKey: ['products', 'best-sellers', limit, windowDays],
    queryFn: () =>
      apiFetch<Product[]>(
        `/products/best-sellers${toQueryString({ limit, windowDays })}`,
      ),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<string[]>('/products/categories'),
    staleTime: 5 * 60 * 1000,
  });
}
