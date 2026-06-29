import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from '@/lib/api';
import type { User } from '@/lib/types';

/** Current user, or null when not authenticated (401 is an expected, non-error state). */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await apiFetch<User>('/auth/me');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      apiFetch<User>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (user) => {
      qc.setQueryData(['me'], user);
      void qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; name: string; password: string }) =>
      apiFetch<User>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (user) => {
      qc.setQueryData(['me'], user);
      void qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ success: true }>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData(['me'], null);
      qc.removeQueries({ queryKey: ['cart'] });
    },
  });
}
