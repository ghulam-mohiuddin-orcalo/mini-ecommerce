import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { StripeService } from './stripe.service';
import { CheckoutSessionResponseDto } from './dto/checkout-session-response.dto';
import { SessionStatusResponseDto } from './dto/session-status-response.dto';
import { PaymentIntentResponseDto } from './dto/payment-intent-response.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly frontendOrigin: string;
  private readonly currency: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly orders: OrdersService,
    config: ConfigService,
  ) {
    this.frontendOrigin = config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000';
    this.currency = (config.get<string>('STRIPE_CURRENCY') ?? 'usd').toLowerCase();
  }

  /**
   * Create a Stripe Checkout Session from the authenticated user's cart. Line items and prices
   * are built from CURRENT database values — the client never supplies prices. userId + cartId
   * are stored in metadata so the webhook can fulfil against the right cart/user.
   */
  async createCheckoutSession(userId: string): Promise<CheckoutSessionResponseDto> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true }, orderBy: { createdAt: 'asc' } } },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.items.map((item) => {
      const p = item.product;
      // Friendly pre-checks; the webhook re-validates authoritatively at fulfilment time.
      if (!p.isActive) {
        throw new ConflictException(`"${p.name}" is no longer available`);
      }
      if (item.quantity > p.stock) {
        throw new ConflictException(`Only ${p.stock} unit(s) of "${p.name}" are in stock`);
      }
      return {
        quantity: item.quantity,
        price_data: {
          currency: this.currency,
          unit_amount: p.priceCents, // authoritative DB price in minor units — never the client's
          product_data: {
            name: p.name,
            images: p.imageUrl.startsWith('http') ? [p.imageUrl] : undefined,
            metadata: { productId: p.id },
          },
        },
      };
    });

    const session = await this.stripe.createCheckoutSession({
      mode: 'payment',
      line_items: lineItems,
      client_reference_id: userId,
      // Stripe substitutes the real id into {CHECKOUT_SESSION_ID} on redirect so we can reconcile.
      success_url: `${this.frontendOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendOrigin}/checkout/cancel`,
      metadata: { userId, cartId: cart.id },
      payment_intent_data: { metadata: { userId, cartId: cart.id } },
    });

    if (!session.url) {
      throw new ServiceUnavailableException('Stripe did not return a Checkout URL');
    }
    return { id: session.id, url: session.url };
  }

  /**
   * Create a Stripe PaymentIntent from the authenticated user's cart for the embedded (in-app)
   * Payment Element flow — no redirect. The amount is computed server-side from CURRENT database
   * prices (the client never supplies prices); userId + cartId go in metadata so the success-poll
   * and the `payment_intent.succeeded` webhook fulfil against the right cart/user. The PaymentIntent
   * id later becomes the order's idempotency key (stored in the same unique column as the hosted
   * flow's session id), so an order is created exactly once across poll + webhook.
   */
  async createPaymentIntent(userId: string): Promise<PaymentIntentResponseDto> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true }, orderBy: { createdAt: 'asc' } } },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    // Friendly pre-checks + authoritative amount; fulfilment re-validates inside the transaction.
    let amountCents = 0;
    for (const item of cart.items) {
      const p = item.product;
      if (!p.isActive) {
        throw new ConflictException(`"${p.name}" is no longer available`);
      }
      if (item.quantity > p.stock) {
        throw new ConflictException(`Only ${p.stock} unit(s) of "${p.name}" are in stock`);
      }
      amountCents += p.priceCents * item.quantity; // DB price in minor units — never the client's
    }

    const intent = await this.stripe.createPaymentIntent({
      amount: amountCents,
      currency: this.currency,
      automatic_payment_methods: { enabled: true },
      metadata: { userId, cartId: cart.id },
    });

    if (!intent.client_secret) {
      throw new ServiceUnavailableException('Stripe did not return a client secret');
    }
    return { clientSecret: intent.client_secret, paymentIntentId: intent.id, amountCents };
  }

  /**
   * Webhook entry point. Verifies the signature (invalid → 400, never processed), then on a
   * `checkout.session.completed` event fulfils the order. Business failures (empty cart,
   * out-of-stock at fulfilment) are acknowledged with 200 so Stripe doesn't retry forever —
   * a production app would trigger a refund here; unexpected errors bubble up (500) so Stripe
   * retries.
   */
  async handleWebhook(payload: Buffer, signature: string | undefined): Promise<void> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.constructEvent(payload, signature);
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.acknowledgingBusinessFailures(session.id, () => this.fulfil(session));
    } else if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.acknowledgingBusinessFailures(intent.id, () => this.fulfilIntent(intent));
    } else {
      this.logger.debug(`Ignoring unhandled Stripe event type: ${event.type}`);
    }
  }

  /**
   * Run a fulfilment, swallowing permanent business failures (empty cart / out-of-stock) with a
   * 200 ack so Stripe stops retrying — a production system would refund here. Unexpected errors
   * bubble up (500) so Stripe retries. Shared by both the session and PaymentIntent webhook paths.
   */
  private async acknowledgingBusinessFailures(ref: string, run: () => Promise<unknown>): Promise<void> {
    try {
      await run();
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof ConflictException) {
        this.logger.error(
          `Could not fulfil ${ref}: ${e.message}. ` +
            'No order created; a production system would refund the payment here.',
        );
        return; // acknowledge (200) — retrying won't help a permanent validation failure
      }
      throw e; // transient/unexpected → 500 so Stripe retries
    }
  }

  /**
   * Success-page reconciliation. Returns the order if the webhook already fulfilled it; otherwise
   * asks Stripe directly and, if paid, fulfils now (idempotent). This makes the success flow
   * reliable whether or not webhook forwarding is running locally — both paths converge on the
   * same idempotent `fulfillStripeCheckout`, so the order is still created exactly once.
   */
  async getSessionStatus(userId: string, sessionId: string): Promise<SessionStatusResponseDto> {
    const existing = await this.orders.findByStripeSession(userId, sessionId);
    if (existing) return { status: 'complete', orderId: existing.id };

    const session = await this.stripe.retrieveSession(sessionId);
    // Ownership guard: never act on a session that isn't this user's.
    if (session.metadata?.userId !== userId) {
      throw new NotFoundException('Checkout session not found');
    }

    if (session.payment_status === 'paid') {
      const order = await this.fulfil(session);
      return { status: 'complete', orderId: order?.id ?? null };
    }
    return { status: session.status === 'expired' ? 'expired' : 'pending', orderId: null };
  }

  /** Fulfil a paid session via the orders transactional core. Returns null if not yet paid. */
  private async fulfil(session: Stripe.Checkout.Session) {
    if (session.payment_status !== 'paid') {
      this.logger.warn(
        `Session ${session.id} completed but payment_status=${session.payment_status}; skipping fulfilment.`,
      );
      return null;
    }
    const userId = session.metadata?.userId;
    if (!userId) {
      this.logger.error(`Session ${session.id} has no userId metadata; cannot fulfil.`);
      return null;
    }
    const paymentRef =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? session.id);

    const order = await this.orders.fulfillStripeCheckout({
      sessionId: session.id,
      userId,
      paymentRef,
      // Assert the order total matches what Stripe actually charged (fail safe on mismatch).
      expectedTotalCents: session.amount_total ?? undefined,
    });
    this.logger.log(`Fulfilled Stripe session ${session.id} → order ${order.id}`);
    return order;
  }

  /**
   * Success-page reconciliation for the embedded PaymentIntent flow — the mirror of
   * `getSessionStatus`. Returns the order if the webhook already fulfilled it; otherwise asks
   * Stripe directly and, if the PaymentIntent has succeeded, fulfils now (idempotent on the PI id).
   * Makes the in-app flow reliable whether or not webhook forwarding is running locally.
   */
  async getPaymentIntentStatus(
    userId: string,
    paymentIntentId: string,
  ): Promise<SessionStatusResponseDto> {
    // The PI id is stored in the same unique idempotency column as the hosted session id.
    const existing = await this.orders.findByStripeSession(userId, paymentIntentId);
    if (existing) return { status: 'complete', orderId: existing.id };

    const intent = await this.stripe.retrievePaymentIntent(paymentIntentId);
    // Ownership guard: never act on a PaymentIntent that isn't this user's.
    if (intent.metadata?.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    if (intent.status === 'succeeded') {
      const order = await this.fulfilIntent(intent);
      return { status: 'complete', orderId: order?.id ?? null };
    }
    // `canceled` → terminal; everything else (processing, requires_action/payment_method) is pending.
    return { status: intent.status === 'canceled' ? 'expired' : 'pending', orderId: null };
  }

  /** Fulfil a succeeded PaymentIntent via the orders transactional core (idempotent on the PI id). */
  private async fulfilIntent(intent: Stripe.PaymentIntent) {
    if (intent.status !== 'succeeded') {
      this.logger.warn(`PaymentIntent ${intent.id} status=${intent.status}; skipping fulfilment.`);
      return null;
    }
    const userId = intent.metadata?.userId;
    if (!userId) {
      this.logger.error(`PaymentIntent ${intent.id} has no userId metadata; cannot fulfil.`);
      return null;
    }
    const order = await this.orders.fulfillStripeCheckout({
      sessionId: intent.id,
      userId,
      paymentRef: intent.id,
      // Assert the order total matches the amount Stripe authorized (fail safe on mismatch).
      expectedTotalCents: intent.amount,
    });
    this.logger.log(`Fulfilled Stripe PaymentIntent ${intent.id} → order ${order.id}`);
    return order;
  }
}
