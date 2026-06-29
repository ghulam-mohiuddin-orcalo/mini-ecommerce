import { Injectable } from '@nestjs/common';
import {
  ChargeInput,
  ChargeResult,
  MOCK_DECLINE_TOKEN,
  PaymentProvider,
} from './payment.interface';

/**
 * Mock payment provider — NO real charges occur.
 *  - Succeeds by default and returns a synthetic reference.
 *  - Declines deterministically when the documented MOCK_DECLINE_TOKEN is supplied,
 *    so failure paths are explicit and testable.
 * A real provider (e.g. Stripe) would implement this same interface; the checkout flow
 * wouldn't change, except a real charge would run outside the DB transaction with a
 * compensating refund on failure.
 */
@Injectable()
export class MockPaymentService implements PaymentProvider {
  charge(input: ChargeInput): Promise<ChargeResult> {
    if (input.token === MOCK_DECLINE_TOKEN) {
      return Promise.resolve({
        status: 'failed',
        reference: '',
        failureReason: 'Card declined (mock)',
      });
    }
    const reference = `mock_${Date.now()}_${input.amountCents}`;
    return Promise.resolve({ status: 'succeeded', reference });
  }
}
