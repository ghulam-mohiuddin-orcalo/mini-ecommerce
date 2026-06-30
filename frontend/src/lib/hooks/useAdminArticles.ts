import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/lib/api';
import type { ArticleCategoryRef, Paginated2 } from '@/lib/types';

export type AdminArticleStatus = 'DRAFT' | 'PUBLISHED';

/** Admin article projection — includes status/publishedAt that the public DTO omits. */
export interface AdminArticleListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  author: string;
  status: AdminArticleStatus;
  publishedAt: string | null;
  category: ArticleCategoryRef | null;
}

export interface AdminArticle extends AdminArticleListItem {
  body: string;
  categoryId: string | null;
  createdAt: string;
}

export interface AdminArticleCategory {
  id: string;
  slug: string;
  name: string;
}

export interface AdminArticleQuery {
  search?: string;
  status?: AdminArticleStatus | '';
  page?: number;
  pageSize?: number;
}

export interface ArticleInput {
  title: string;
  excerpt: string;
  body: string;
  coverUrl: string;
  author: string;
  slug?: string;
  categoryId?: string | null;
  status?: AdminArticleStatus;
}

const ADMIN_ARTICLES_KEY = ['admin', 'articles'] as const;

export function useAdminArticles(query: AdminArticleQuery, enabled: boolean) {
  return useQuery({
    queryKey: [...ADMIN_ARTICLES_KEY, query],
    queryFn: () =>
      apiFetch<Paginated2<AdminArticleListItem>>(
        `/admin/articles${toQueryString({
          search: query.search,
          status: query.status || undefined,
          page: query.page,
          pageSize: query.pageSize,
        })}`,
      ),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useAdminArticle(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'article', id],
    queryFn: () => apiFetch<AdminArticle>(`/admin/articles/${id}`),
    enabled: enabled && Boolean(id),
  });
}

export function useAdminArticleCategories(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'articles', 'categories'],
    queryFn: () => apiFetch<AdminArticleCategory[]>('/admin/articles/categories'),
    enabled,
  });
}

function useInvalidateArticles() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ADMIN_ARTICLES_KEY });
    void qc.invalidateQueries({ queryKey: ['articles'] });
  };
}

export function useCreateArticleCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; slug?: string }) =>
      apiFetch<AdminArticleCategory>('/admin/articles/categories', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'articles', 'categories'] });
      void qc.invalidateQueries({ queryKey: ['articles', 'categories'] });
    },
  });
}

export function useCreateArticle() {
  const invalidate = useInvalidateArticles();
  return useMutation({
    mutationFn: (body: ArticleInput) =>
      apiFetch<AdminArticle>('/admin/articles', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useUpdateArticle() {
  const invalidate = useInvalidateArticles();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ArticleInput> }) =>
      apiFetch<AdminArticle>(`/admin/articles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

export function useSetArticlePublished() {
  const invalidate = useInvalidateArticles();
  return useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      apiFetch<AdminArticle>(`/admin/articles/${id}/${published ? 'publish' : 'unpublish'}`, {
        method: 'PATCH',
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteArticle() {
  const invalidate = useInvalidateArticles();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/admin/articles/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
