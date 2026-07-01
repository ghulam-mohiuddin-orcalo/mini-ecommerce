'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/States';
import { Container } from '@/components/store/Container';

/**
 * Stripe Checkout cancel return page. Stripe redirects here when the customer abandons the
 * hosted Checkout. No payment was taken and the cart is untouched — they can resume any time.
 */
export default function CheckoutCancelPage() {
  return (
    <Container width="narrow" className="py-8">
      <div className="pp-rise">
        <EmptyState
          icon={<Icon name="x-circle" size={28} />}
          title="Payment cancelled"
          description="No charge was made and your cart is still intact. You can pick up where you left off whenever you’re ready."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/checkout"><Button>Return to checkout</Button></Link>
              <Link href="/cart"><Button variant="secondary">View cart</Button></Link>
            </div>
          }
        />
      </div>
    </Container>
  );
}
