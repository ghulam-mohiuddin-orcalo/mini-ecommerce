import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Address } from '@/lib/types';

const ADDRESSES_KEY = ['addresses'] as const;

export interface AddressInput {
  label: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
  isDefault?: boolean;
}

/** The authenticated user's saved addresses (default first). Auth-only endpoint. */
export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: ADDRESSES_KEY,
    queryFn: () => apiFetch<Address[]>('/addresses'),
    enabled,
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddressInput) =>
      apiFetch<Address>('/addresses', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ADDRESSES_KEY }),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AddressInput & { id: string }) =>
      apiFetch<Address>(`/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ADDRESSES_KEY }),
  });
}

export function useSetDefaultAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<Address>(`/addresses/${id}/default`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ADDRESSES_KEY }),
  });
}

/** Delete returns the updated list (server convention), which we write straight into cache. */
export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<Address[]>(`/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: (list) => qc.setQueryData(ADDRESSES_KEY, list),
  });
}
