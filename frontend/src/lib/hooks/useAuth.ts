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
      // Start from a clean cache so no prior visitor's user-scoped data (wishlist, cart, orders)
      // is inherited, then seed the freshly authenticated user.
      qc.clear();
      qc.setQueryData(['me'], user);
    },
  });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; name: string; password: string }) =>
      apiFetch<User>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (user) => {
      // Clean slate for the new account (see useLogin), then seed the authenticated user.
      qc.clear();
      qc.setQueryData(['me'], user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ success: true }>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      // Drop every cached query so no user-scoped data (wishlist, cart, orders, recommendations,
      // addresses) lingers for the signed-out visitor or leaks into a subsequent user's session.
      // Then mark the user signed-out immediately so guards react without a refetch flash.
      qc.clear();
      qc.setQueryData(['me'], null);
    },
  });
}
