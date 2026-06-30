import { HttpStatus, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { StripeModule } from './payments/stripe.module';
import { AdminModule } from './admin/admin.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AddressesModule } from './addresses/addresses.module';
import { ArticlesModule } from './articles/articles.module';
import { SiteContentModule } from './site-content/site-content.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate-limit auth endpoints (applied via ThrottlerGuard on AuthController only).
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: Number(process.env.AUTH_THROTTLE_LIMIT ?? 10),
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    StripeModule,
    AdminModule,
    RecommendationsModule,
    WishlistModule,
    ReviewsModule,
    AddressesModule,
    ArticlesModule,
    SiteContentModule,
  ],
  controllers: [AppController],
  providers: [
    // Validation errors surface as 422 Unprocessable Entity through the global filter.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Order matters: authenticate first (populates req.user), then authorize by role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
