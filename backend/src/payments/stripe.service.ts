import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * Thin wrapper around the official Stripe Node SDK. Owns the single Stripe client and the
 * webhook secret, reading both from environment (never hard-coded). All Stripe API access goes
 * through here so the rest of the app stays free of SDK details.
 *
 * Test Mode only: keys are `sk_test_…` / `whsec_…`. If `STRIPE_SECRET_KEY` is absent the service
 * stays inert and any Stripe call returns 503 — the app still boots (handy for non-payment dev).
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    this.stripe = key ? new Stripe(key) : null;
    if (!key) {
      this.logger.warn('STRIPE_SECRET_KEY is not set — Stripe Checkout is disabled until configured.');
    }
  }

  get isConfigured(): boolean {
    return this.stripe !== null;
  }

  private client(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Payments are not configured (missing STRIPE_SECRET_KEY).');
    }
    return this.stripe;
  }

  createCheckoutSession(
    params: Stripe.Checkout.SessionCreateParams,
  ): Promise<Stripe.Checkout.Session> {
    return this.client().checkout.sessions.create(params);
  }

  retrieveSession(id: string): Promise<Stripe.Checkout.Session> {
    return this.client().checkout.sessions.retrieve(id);
  }

  /**
   * Verify a webhook payload against the signature header using STRIPE_WEBHOOK_SECRET.
   * Throws `Stripe.errors.StripeSignatureVerificationError` if the signature is invalid —
   * the caller maps that to 400 and never processes the event.
   */
  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    if (!this.webhookSecret) {
      throw new ServiceUnavailableException('Webhooks are not configured (missing STRIPE_WEBHOOK_SECRET).');
    }
    return this.client().webhooks.constructEvent(payload, signature, this.webhookSecret);
  }
}
