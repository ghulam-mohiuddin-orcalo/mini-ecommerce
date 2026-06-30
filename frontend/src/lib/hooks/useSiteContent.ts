import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ContactAcknowledgement, ContentBlock, FaqCategory } from '@/lib/types';

/** Grouped FAQ — categories (ordered) each with their ordered items. Public. */
export function useFaq() {
  return useQuery({
    queryKey: ['faq'],
    queryFn: () => apiFetch<FaqCategory[]>('/faq'),
    staleTime: 5 * 60 * 1000,
  });
}

/** A CMS content block by natural key (e.g. 'about', 'privacy', 'terms', 'shipping', 'returns'). */
export function useContent(key: string) {
  return useQuery({
    queryKey: ['content', key],
    queryFn: () => apiFetch<ContentBlock>(`/content/${key}`),
    enabled: Boolean(key),
    staleTime: 5 * 60 * 1000,
  });
}

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  body: string;
}

/** Submit the contact form — stores a real ContactMessage and returns a generic acknowledgement. */
export function useContactSubmit() {
  return useMutation({
    mutationFn: (input: ContactInput) =>
      apiFetch<ContactAcknowledgement>('/contact', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}
