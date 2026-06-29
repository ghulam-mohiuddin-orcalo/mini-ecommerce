import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface CheckoutSession {
  id: string;
  url: string;
}

export type SessionStatus = 'complete' | 'pending' | 'expired';

export interface SessionStatusResult {
  status: SessionStatus;
  orderId: string | null;
}

/**
 * Create a Stripe Checkout Session from the current cart. The backend builds line items and
 * prices from authoritative DB values — the client never sends prices or totals. On success
 * the caller redirects the browser to the returned Stripe-hosted Checkout URL.
 */
export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: () =>
      apiFetch<CheckoutSession>('/payments/checkout-session', { method: 'POST' }),
  });
}

/**
 * Poll a Checkout Session's status on the success page. The backend returns `complete` with an
 * `orderId` once the order has been fulfilled (by the webhook, or by this very call reconciling
 * directly with Stripe). Polling makes the success flow reliable whether or not webhook
 * forwarding is running locally — fulfilment is idempotent, so the order is still created once.
 */
export function useSessionStatus(sessionId: string | null) {
  return useQuery({
    queryKey: ['checkout-session', sessionId],
    queryFn: () => apiFetch<SessionStatusResult>(`/payments/checkout-session/${sessionId}`),
    enabled: Boolean(sessionId),
    // Keep polling until the order is created (or the session expires); stop once terminal.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'complete' || status === 'expired' ? false : 1500;
    },
  });
}
