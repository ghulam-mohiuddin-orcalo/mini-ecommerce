/** DI token for the payment provider, so the concrete implementation is swappable. */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

/** Documented test token: sending this as the checkout paymentToken forces a decline. */
export const MOCK_DECLINE_TOKEN = 'tok_decline';

export interface ChargeInput {
  amountCents: number;
  token?: string;
}

export interface ChargeResult {
  status: 'succeeded' | 'failed';
  reference: string;
  failureReason?: string;
}

export interface PaymentProvider {
  charge(input: ChargeInput): Promise<ChargeResult>;
}
