import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/**
 * Newsletter signup.
 *
 * There is intentionally no dedicated `/newsletter` endpoint: rather than fake the
 * interaction client-side, a signup is recorded as a real ContactMessage via the
 * `POST /contact` intent with a fixed subject. The server persists it like any other
 * inbound message, so the action is genuine end-to-end (no localStorage, no no-op).
 *
 * The mutation is non-optimistic — the caller awaits the server's acknowledgement and
 * only then surfaces a success toast. `ApiError` propagates for the caller to show the
 * failure path.
 */
export interface NewsletterSignupBody {
  email: string;
}

interface ContactIntent {
  /** Fixed marker so newsletter signups are distinguishable from support messages. */
  subject: string;
  email: string;
  /** Reuses the contact message body the server already accepts. */
  message: string;
}

export function useNewsletterSignup() {
  return useMutation({
    mutationFn: ({ email }: NewsletterSignupBody) => {
      const body: ContactIntent = {
        subject: 'Newsletter signup',
        email,
        message: `Newsletter signup request from ${email}.`,
      };
      return apiFetch<{ success: true }>('/contact', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  });
}
