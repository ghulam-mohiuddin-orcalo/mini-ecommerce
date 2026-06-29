import { Module } from '@nestjs/common';
import { MockPaymentService } from './mock-payment.service';
import { PAYMENT_PROVIDER } from './payment.interface';

@Module({
  providers: [{ provide: PAYMENT_PROVIDER, useClass: MockPaymentService }],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentModule {}
