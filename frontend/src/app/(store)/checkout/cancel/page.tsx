'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';

/**
 * Stripe Checkout cancel return page. Stripe redirects here when the customer abandons the
 * hosted Checkout. No payment was taken and the cart is untouched — they can resume any time.
 */
export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <EmptyState
        title="Payment cancelled"
        description="No charge was made and your cart is still intact. You can pick up where you left off whenever you’re ready."
        icon={
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/checkout"><Button>Return to checkout</Button></Link>
            <Link href="/cart"><Button variant="secondary">View cart</Button></Link>
          </div>
        }
      />
    </div>
  );
}
