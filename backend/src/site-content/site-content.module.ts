import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminSiteContentController } from './admin-site-content.controller';
import { SiteContentController } from './site-content.controller';
import { SiteContentService } from './site-content.service';

@Module({
  imports: [PrismaModule],
  controllers: [SiteContentController, AdminSiteContentController],
  providers: [SiteContentService],
  exports: [SiteContentService],
})
export class SiteContentModule {}
