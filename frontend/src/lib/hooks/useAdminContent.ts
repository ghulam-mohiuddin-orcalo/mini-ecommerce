import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/lib/api';
import type { ContentBlock, FaqCategory, Paginated2 } from '@/lib/types';

// --- FAQ ----------------------------------------------------------------------------
// Read the current FAQ tree from the public endpoint; mutate via admin routes.

export interface FaqCategoryInput {
  name: string;
  slug?: string;
  position?: number;
}

export interface FaqItemInput {
  categoryId: string;
  question: string;
  body: string;
  position?: number;
}

function useInvalidateFaq() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ['faq'] });
}

/** The public FAQ tree, reused in the admin manager (gated via `enabled`). */
export function useFaqTree(enabled: boolean) {
  return useQuery({
    queryKey: ['faq'],
    queryFn: () => apiFetch<FaqCategory[]>('/faq'),
    enabled,
  });
}

export function useCreateFaqCategory() {
  const invalidate = useInvalidateFaq();
  return useMutation({
    mutationFn: (body: FaqCategoryInput) =>
      apiFetch<FaqCategory>('/admin/faq/categories', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useUpdateFaqCategory() {
  const invalidate = useInvalidateFaq();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<FaqCategoryInput> }) =>
      apiFetch<FaqCategory>(`/admin/faq/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteFaqCategory() {
  const invalidate = useInvalidateFaq();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/admin/faq/categories/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useCreateFaqItem() {
  const invalidate = useInvalidateFaq();
  return useMutation({
    mutationFn: (body: FaqItemInput) =>
      apiFetch<FaqCategory>('/admin/faq/items', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useUpdateFaqItem() {
  const invalidate = useInvalidateFaq();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<FaqItemInput> }) =>
      apiFetch<FaqCategory>(`/admin/faq/items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteFaqItem() {
  const invalidate = useInvalidateFaq();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/admin/faq/items/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

// --- Content blocks -----------------------------------------------------------------

export interface ContentInput {
  title: string;
  body: string;
}

export function useAdminContentBlocks(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'content'],
    queryFn: () => apiFetch<ContentBlock[]>('/admin/content'),
    enabled,
  });
}

export function useUpsertContentBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, body }: { key: string; body: ContentInput }) =>
      apiFetch<ContentBlock>(`/admin/content/${key}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: (_data, { key }) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'content'] });
      void qc.invalidateQueries({ queryKey: ['content', key] });
    },
  });
}

export function useDeleteContentBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => apiFetch<void>(`/admin/content/${key}`, { method: 'DELETE' }),
    onSuccess: (_data, key) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'content'] });
      void qc.invalidateQueries({ queryKey: ['content', key] });
    },
  });
}

// --- Contact inbox ------------------------------------------------------------------

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  handled: boolean;
  createdAt: string;
}

export interface ContactQuery {
  handled?: boolean;
  page?: number;
  pageSize?: number;
}

export function useAdminContactMessages(query: ContactQuery, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'contact', query],
    queryFn: () =>
      apiFetch<Paginated2<ContactMessage>>(
        `/admin/contact${toQueryString({
          handled: query.handled === undefined ? undefined : String(query.handled),
          page: query.page,
          pageSize: query.pageSize,
        })}`,
      ),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useSetContactHandled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, handled }: { id: string; handled: boolean }) =>
      apiFetch<ContactMessage>(`/admin/contact/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ handled }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'contact'] }),
  });
}

export function useDeleteContactMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/admin/contact/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'contact'] }),
  });
}
