import { loadStripe, type Stripe } from '@stripe/stripe-js';

/**
 * Single, lazily-created Stripe.js instance for the embedded Payment Element. The publishable key
 * is safe to expose to the browser by design (it's a `pk_…` key). Returns null if the key is
 * unset so callers can render a graceful "payments unavailable" state instead of crashing.
 */
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> | null {
  if (!publishableKey) return null;
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}
