import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';

/**
 * Stripe Checkout integration. Imports OrdersModule (one-directional) to reuse the existing
 * transactional checkout core for fulfilment — no circular dependency, since OrdersModule has
 * no knowledge of Stripe. PrismaModule and ConfigModule are global.
 */
@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [StripeService, PaymentsService],
  exports: [StripeService],
})
export class StripeModule {}
