import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

/** Read-only product suggestions. PrismaService is global, so no extra imports are needed. */
@Module({
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
