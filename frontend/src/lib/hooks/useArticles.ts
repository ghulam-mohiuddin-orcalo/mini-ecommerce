import { useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/lib/api';
import type {
  Article,
  ArticleCategoryWithCount,
  ArticleListItem,
  Paginated,
} from '@/lib/types';

export interface ArticleQuery {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

/** Paginated published articles (Journal listing) with optional search + category filter. */
export function useArticles(query: ArticleQuery) {
  return useQuery({
    queryKey: ['articles', query],
    queryFn: () =>
      apiFetch<Paginated<ArticleListItem>>(
        `/articles${toQueryString({
          search: query.search,
          category: query.category,
          page: query.page,
          pageSize: query.pageSize,
        })}`,
      ),
    placeholderData: (prev) => prev,
  });
}

/** Article categories that have at least one published article (with counts). */
export function useArticleCategories() {
  return useQuery({
    queryKey: ['articles', 'categories'],
    queryFn: () => apiFetch<ArticleCategoryWithCount[]>('/articles/categories'),
    staleTime: 5 * 60 * 1000,
  });
}

/** A single published article by slug. */
export function useArticle(slug: string) {
  return useQuery({
    queryKey: ['article', slug],
    queryFn: () => apiFetch<Article>(`/articles/${slug}`),
    enabled: Boolean(slug),
  });
}

/** Up to three related published articles for the given slug. */
export function useRelatedArticles(slug: string) {
  return useQuery({
    queryKey: ['article', slug, 'related'],
    queryFn: () => apiFetch<ArticleListItem[]>(`/articles/${slug}/related`),
    enabled: Boolean(slug),
  });
}
