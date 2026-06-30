import { Module } from '@nestjs/common';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

/** The authenticated user's product wishlist. PrismaService is global, so no extra imports. */
@Module({
  controllers: [WishlistController],
  providers: [WishlistService],
})
export class WishlistModule {}
