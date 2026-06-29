import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { AdminProductsController } from './admin-products.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AnalyticsService } from './analytics.service';

/** Admin is a role-gated surface over the existing Products/Orders services + analytics. */
@Module({
  imports: [ProductsModule, OrdersModule],
  controllers: [AdminProductsController, AdminOrdersController, AdminAnalyticsController],
  providers: [AnalyticsService],
})
export class AdminModule {}
