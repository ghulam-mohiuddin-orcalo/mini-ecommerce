import { Module } from '@nestjs/common';
import { PaymentModule } from '../payments/payment.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [PaymentModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService], // admin order management (M6) builds on this
})
export class OrdersModule {}
