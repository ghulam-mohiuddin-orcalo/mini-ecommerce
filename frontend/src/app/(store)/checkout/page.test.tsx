import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// --- Mocks: isolate the page's branching logic (the regression locus) from Stripe + data layer.
vi.mock('@/lib/stripe', () => ({ getStripe: () => Promise.resolve({}) }));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
}));
vi.mock('@/components/store/CheckoutForm', () => ({
  CheckoutForm: ({ amountCents }: { amountCents: number }) => (
    <div data-testid="checkout-form">Checkout form · {amountCents}</div>
  ),
}));
vi.mock('@/lib/hooks/usePreferences', () => ({ usePreferences: () => ({ resolvedTheme: 'light' }) }));
vi.mock('@/lib/hooks/useAuth', () => ({ useMe: vi.fn() }));
vi.mock('@/lib/hooks/useCart', () => ({ useCart: vi.fn() }));
vi.mock('@/lib/hooks/usePayments', () => ({ usePaymentIntent: vi.fn() }));

import CheckoutPage from '@/app/(store)/checkout/page';
import { useMe } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';
import { usePaymentIntent } from '@/lib/hooks/usePayments';

const useMeMock = vi.mocked(useMe);
const useCartMock = vi.mocked(useCart);
const usePaymentIntentMock = vi.mocked(usePaymentIntent);

const user = { id: 'u1', email: 'c@shop.test', name: 'Cee Customer', role: 'CUSTOMER' as const };
const cart = {
  id: 'c1',
  itemCount: 2,
  totalCents: 4000,
  items: [
    {
      productId: 'p1',
      name: 'Tee',
      imageUrl: 'x',
      category: 'apparel',
      unitPriceCents: 2000,
      quantity: 2,
      lineTotalCents: 4000,
      stock: 9,
      available: true,
    },
  ],
};

// Cast helpers keep the tests readable; the hook return shapes are large query objects.
const me = (v: unknown) => useMeMock.mockReturnValue(v as ReturnType<typeof useMe>);
const theCart = (v: unknown) => useCartMock.mockReturnValue(v as ReturnType<typeof useCart>);
const intent = (v: unknown) => usePaymentIntentMock.mockReturnValue(v as ReturnType<typeof usePaymentIntent>);

beforeEach(() => {
  vi.clearAllMocks();
  me({ data: user, isLoading: false });
  theCart({ data: cart, isLoading: false });
  intent({ data: undefined, isLoading: true, isError: false });
});

describe('CheckoutPage', () => {
  it('renders the embedded checkout form on the FIRST render once the intent is ready (regression)', () => {
    // The bug: on client navigation the page got stuck on the skeleton because the intent was
    // created imperatively and orphaned. With the cache-backed query, data present on the first
    // render must immediately yield the form — never a stuck skeleton.
    intent({ data: { clientSecret: 'cs_1', paymentIntentId: 'pi_1', amountCents: 4000 }, isLoading: false, isError: false });
    const { container } = render(<CheckoutPage />);
    expect(screen.getByTestId('checkout-form')).toBeInTheDocument();
    expect(container.querySelectorAll('.pp-skeleton').length).toBe(0);
  });

  it('shows a loading skeleton (not the form) while the intent is being created', () => {
    const { container } = render(<CheckoutPage />);
    expect(screen.queryByTestId('checkout-form')).toBeNull();
    expect(container.querySelectorAll('.pp-skeleton').length).toBeGreaterThan(0);
  });

  it('shows the empty-cart state (not the form) when the cart has no items', () => {
    theCart({ data: { id: 'c1', itemCount: 0, totalCents: 0, items: [] }, isLoading: false });
    render(<CheckoutPage />);
    expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-form')).toBeNull();
  });

  it('prompts sign-in when unauthenticated', () => {
    me({ data: null, isLoading: false });
    theCart({ data: undefined, isLoading: false });
    render(<CheckoutPage />);
    expect(screen.getByText(/sign in to check out/i)).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-form')).toBeNull();
  });

  it('shows an error with a retry affordance when intent creation fails', () => {
    intent({ data: undefined, isLoading: false, isError: true, error: new Error('boom'), refetch: vi.fn() });
    render(<CheckoutPage />);
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-form')).toBeNull();
  });
});
