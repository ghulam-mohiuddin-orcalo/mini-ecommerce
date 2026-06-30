import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * PaymentsService variant-pricing unit tests (MEDIUM-2). DB- and network-free: the cart read is
 * mocked and Stripe is mocked, so we assert the AMOUNT calc directly. Proves that when a cart line
 * has a variant, both `createPaymentIntent` and `createCheckoutSession` price from the VARIANT
 * (not the product) and validate against the VARIANT's stock — a full e2e would need a live Stripe
 * Test Mode account, so a focused calc assertion is the right tool here (and mirrors how the
 * existing webhook spec mocks Stripe).
 */
describe('PaymentsService (variant pricing)', () => {
  let service: PaymentsService;
  let stripe: jest.Mocked<Pick<StripeService, 'createPaymentIntent' | 'createCheckoutSession'>>;
  let cartFindUnique: jest.Mock;

  const PRODUCT_PRICE = 5000;
  const PRODUCT_STOCK = 100;
  const VARIANT_PRICE = 4500; // deliberately different from the product price
  const VARIANT_STOCK = 3;

  /** A cart with one variant line (qty 2) plus one plain line (qty 1). */
  const variantCart = (over: { variantStock?: number } = {}) => ({
    id: 'cart-1',
    userId: 'user-1',
    items: [
      {
        quantity: 2,
        product: {
          id: 'prod-1',
          name: 'Variant Hoodie',
          priceCents: PRODUCT_PRICE,
          stock: PRODUCT_STOCK,
          isActive: true,
          imageUrl: 'https://example.com/h.png',
        },
        variant: {
          id: 'var-1',
          label: 'Medium',
          priceCents: VARIANT_PRICE,
          stock: over.variantStock ?? VARIANT_STOCK,
          isActive: true,
        },
      },
      {
        quantity: 1,
        product: {
          id: 'prod-2',
          name: 'Plain Mug',
          priceCents: 1200,
          stock: 10,
          isActive: true,
          imageUrl: 'https://example.com/m.png',
        },
        variant: null,
      },
    ],
  });

  // variant line: 4500 * 2, plain line: 1200 * 1  →  variant-based total
  const EXPECTED_TOTAL = VARIANT_PRICE * 2 + 1200 * 1;
  // What it WOULD have been if (wrongly) priced from the product: 5000 * 2 + 1200.
  const WRONG_PRODUCT_TOTAL = PRODUCT_PRICE * 2 + 1200 * 1;

  beforeEach(() => {
    cartFindUnique = jest.fn();
    stripe = {
      createPaymentIntent: jest
        .fn()
        .mockResolvedValue({ id: 'pi_1', client_secret: 'pi_1_secret' } as Stripe.PaymentIntent),
      createCheckoutSession: jest
        .fn()
        .mockResolvedValue({ id: 'cs_1', url: 'https://stripe.test/cs_1' } as Stripe.Checkout.Session),
    };
    const prisma = { cart: { findUnique: cartFindUnique } } as unknown as PrismaService;
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    service = new PaymentsService(prisma, stripe as unknown as StripeService, {} as OrdersService, config);
  });

  it('createPaymentIntent prices the variant line from the VARIANT, not the product', async () => {
    cartFindUnique.mockResolvedValue(variantCart());

    const res = await service.createPaymentIntent('user-1');

    expect(res.amountCents).toBe(EXPECTED_TOTAL);
    expect(res.amountCents).not.toBe(WRONG_PRODUCT_TOTAL);
    expect(stripe.createPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({ amount: EXPECTED_TOTAL }),
    );
  });

  it('createCheckoutSession builds the variant line at the VARIANT unit_amount and labels it', async () => {
    cartFindUnique.mockResolvedValue(variantCart());

    await service.createCheckoutSession('user-1');

    const params = stripe.createCheckoutSession.mock
      .calls[0][0] as Stripe.Checkout.SessionCreateParams;
    const lines = params.line_items ?? [];
    const variantLine = lines.find(
      (l) => l.price_data?.product_data?.name === 'Variant Hoodie — Medium',
    );
    expect(variantLine).toBeDefined();
    expect(variantLine?.price_data?.unit_amount).toBe(VARIANT_PRICE);
    // Variant id is threaded into the line metadata for fulfilment.
    expect(variantLine?.price_data?.product_data?.metadata).toMatchObject({
      productId: 'prod-1',
      variantId: 'var-1',
    });
  });

  it('validates against the VARIANT stock, not the product stock (oversell on the variant → 409)', async () => {
    // Variant has only 1 left though the cart wants 2; the product has plenty. Must still 409.
    cartFindUnique.mockResolvedValue(variantCart({ variantStock: 1 }));

    await expect(service.createPaymentIntent('user-1')).rejects.toBeInstanceOf(ConflictException);
    expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('createCheckoutSession also 409s when the variant is short despite product stock', async () => {
    cartFindUnique.mockResolvedValue(variantCart({ variantStock: 1 }));

    await expect(service.createCheckoutSession('user-1')).rejects.toBeInstanceOf(ConflictException);
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
  });
});
