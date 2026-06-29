import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { ConflictException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * PaymentsService webhook unit tests. Stripe and the orders core are mocked so we can drive the
 * exact verification scenarios from the brief without a live Stripe account or database:
 *   - invalid webhook signature is rejected (400) and never fulfilled
 *   - a paid `checkout.session.completed` fulfils exactly once
 *   - duplicate delivery is idempotent (delegated to the orders core, which dedupes by session id)
 *   - out-of-stock at fulfilment is acknowledged (200) and creates no order
 *   - unrelated/unpaid events are ignored
 *
 * The order-is-created-exactly-once / stock-decremented-once integrity itself lives in the
 * transactional orders core and is exercised by the orders e2e suite; here we verify the
 * webhook routing, signature gate, and error handling around it.
 */
describe('PaymentsService (webhook)', () => {
  let service: PaymentsService;
  let stripe: jest.Mocked<Pick<StripeService, 'constructEvent' | 'createCheckoutSession' | 'retrieveSession'>>;
  let orders: jest.Mocked<Pick<OrdersService, 'fulfillStripeCheckout' | 'findByStripeSession'>>;

  const paidSession = (overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session =>
    ({
      id: 'cs_test_123',
      object: 'checkout.session',
      payment_status: 'paid',
      status: 'complete',
      payment_intent: 'pi_test_123',
      metadata: { userId: 'user-1', cartId: 'cart-1' },
      ...overrides,
    }) as Stripe.Checkout.Session;

  const completedEvent = (session: Stripe.Checkout.Session): Stripe.Event =>
    ({ type: 'checkout.session.completed', data: { object: session } }) as unknown as Stripe.Event;

  beforeEach(() => {
    stripe = {
      constructEvent: jest.fn(),
      createCheckoutSession: jest.fn(),
      retrieveSession: jest.fn(),
    };
    orders = {
      fulfillStripeCheckout: jest.fn().mockResolvedValue({ id: 'order-1' }),
      findByStripeSession: jest.fn(),
    };
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    service = new PaymentsService(
      {} as PrismaService,
      stripe as unknown as StripeService,
      orders as unknown as OrdersService,
      config,
    );
  });

  it('rejects an invalid webhook signature (400) and never fulfils', async () => {
    // StripeService throws on a bad signature; PaymentsService catches any such error → 400.
    stripe.constructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload');
    });

    await expect(service.handleWebhook(Buffer.from('{}'), 'bad-signature')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(orders.fulfillStripeCheckout).not.toHaveBeenCalled();
  });

  it('rejects a missing signature header (400)', async () => {
    await expect(service.handleWebhook(Buffer.from('{}'), undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(stripe.constructEvent).not.toHaveBeenCalled();
  });

  it('fulfils a paid checkout.session.completed exactly once', async () => {
    const session = paidSession();
    stripe.constructEvent.mockReturnValue(completedEvent(session));

    await service.handleWebhook(Buffer.from('{}'), 'good-sig');

    expect(orders.fulfillStripeCheckout).toHaveBeenCalledTimes(1);
    expect(orders.fulfillStripeCheckout).toHaveBeenCalledWith({
      sessionId: 'cs_test_123',
      userId: 'user-1',
      paymentRef: 'pi_test_123',
    });
  });

  it('is idempotent across duplicate deliveries (orders core dedupes by session id)', async () => {
    const session = paidSession();
    stripe.constructEvent.mockReturnValue(completedEvent(session));
    // The orders core returns the same order for a repeat session id (verified in its own suite).
    orders.fulfillStripeCheckout.mockResolvedValue({ id: 'order-1' } as never);

    await service.handleWebhook(Buffer.from('{}'), 'good-sig');
    await service.handleWebhook(Buffer.from('{}'), 'good-sig');

    // Both deliveries route to the idempotent core; neither throws, no second order is forced.
    expect(orders.fulfillStripeCheckout).toHaveBeenCalledTimes(2);
    expect(orders.fulfillStripeCheckout).toHaveBeenNthCalledWith(2, {
      sessionId: 'cs_test_123',
      userId: 'user-1',
      paymentRef: 'pi_test_123',
    });
  });

  it('acknowledges (does not throw) when stock ran out at fulfilment — no order created', async () => {
    stripe.constructEvent.mockReturnValue(completedEvent(paidSession()));
    orders.fulfillStripeCheckout.mockRejectedValue(
      new ConflictException('Not enough stock for "Thing" (only 0 left)'),
    );

    // Business failure → 200 ack so Stripe stops retrying a permanently-failing event.
    await expect(service.handleWebhook(Buffer.from('{}'), 'good-sig')).resolves.toBeUndefined();
  });

  it('re-throws unexpected fulfilment errors so Stripe retries (500)', async () => {
    stripe.constructEvent.mockReturnValue(completedEvent(paidSession()));
    orders.fulfillStripeCheckout.mockRejectedValue(new Error('database unavailable'));

    await expect(service.handleWebhook(Buffer.from('{}'), 'good-sig')).rejects.toThrow(
      'database unavailable',
    );
  });

  it('does not fulfil when the session is not paid', async () => {
    stripe.constructEvent.mockReturnValue(completedEvent(paidSession({ payment_status: 'unpaid' })));

    await service.handleWebhook(Buffer.from('{}'), 'good-sig');
    expect(orders.fulfillStripeCheckout).not.toHaveBeenCalled();
  });

  it('ignores unrelated event types', async () => {
    stripe.constructEvent.mockReturnValue({
      type: 'payment_intent.created',
      data: { object: {} },
    } as unknown as Stripe.Event);

    await service.handleWebhook(Buffer.from('{}'), 'good-sig');
    expect(orders.fulfillStripeCheckout).not.toHaveBeenCalled();
  });
});
