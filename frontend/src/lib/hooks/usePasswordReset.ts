import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/**
 * Request a password-reset link. Always resolves with a generic message (the server never reveals
 * whether the email exists). In development the response also carries `resetToken` so the flow can
 * be exercised without a mailer — production omits it.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch<{ message: string; resetToken?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  });
}

/** Complete a password reset with a token + new password. Does not auto-login. */
export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; password: string }) =>
      apiFetch<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}

/** Change the password of the signed-in user (requires the current password; 401 if wrong). */
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      apiFetch<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}
