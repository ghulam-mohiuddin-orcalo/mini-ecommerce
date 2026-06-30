import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

/** Product reviews: public listing + verified-purchase-gated create + owner/admin delete. */
@Module({
  imports: [PrismaModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
