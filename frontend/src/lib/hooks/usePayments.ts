import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Cart } from '@/lib/types';

export interface CheckoutSession {
  id: string;
  url: string;
}

export type SessionStatus = 'complete' | 'pending' | 'expired';

export interface SessionStatusResult {
  status: SessionStatus;
  orderId: string | null;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number;
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

/**
 * Establish the Stripe PaymentIntent for the current cart, as a QUERY (not an effect-driven
 * mutation) so it is render-critical-data-safe:
 *  - it runs deterministically once `enabled` (a non-empty cart) is true — no effect/ref timing;
 *  - the result lives in the QueryCache keyed by cart state, so a remount (React StrictMode,
 *    Fast Refresh, route transition) re-subscribes to the same in-flight/cached result instead
 *    of orphaning it — the bug that left the page stuck on the skeleton after client navigation;
 *  - it's deduped and cached, so navigating away and back reuses the same PaymentIntent (no
 *    duplicate intents), and a cart change (new total) keys a fresh intent with the right amount.
 * The backend computes the amount from authoritative DB prices — the client never sends prices.
 */
export function usePaymentIntent(cart: Cart | undefined) {
  return useQuery({
    // Cart id + total + count: a stable identity for "this cart state", so the intent is created
    // once per state and re-created (correct amount) only if the cart actually changes.
    queryKey: ['payment-intent', cart?.id, cart?.totalCents, cart?.itemCount],
    queryFn: () => apiFetch<PaymentIntentResult>('/payments/payment-intent', { method: 'POST' }),
    enabled: Boolean(cart && cart.items.length > 0),
    // A created intent is reused, never silently re-POSTed by background refetch triggers.
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Reconcile a PaymentIntent after confirmation and resolve the created order — the mirror of
 * `useSessionStatus`. The backend returns `complete` with an `orderId` once the order is fulfilled
 * (by this idempotent call or the `payment_intent.succeeded` webhook). Disabled until a
 * PaymentIntent id is available (i.e. after a successful confirm).
 */
export function usePaymentIntentStatus(paymentIntentId: string | null) {
  return useQuery({
    queryKey: ['payment-intent', paymentIntentId],
    queryFn: () =>
      apiFetch<SessionStatusResult>(`/payments/payment-intent/${paymentIntentId}`),
    enabled: Boolean(paymentIntentId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'complete' || status === 'expired' ? false : 1500;
    },
  });
}
