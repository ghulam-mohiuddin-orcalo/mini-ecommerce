import { HttpException, HttpStatus } from '@nestjs/common';

/** 402 Payment Required — used when a (mock) payment is declined. */
export class PaymentRequiredException extends HttpException {
  constructor(message = 'Payment failed') {
    super(message, HttpStatus.PAYMENT_REQUIRED);
  }
}
