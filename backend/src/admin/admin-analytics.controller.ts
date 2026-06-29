import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';
import { AnalyticsService } from './analytics.service';

@ApiTags('admin: analytics')
@ApiCookieAuth()
@Roles(Role.ADMIN)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: 'Dashboard analytics: sales, order counts, top products, recent orders' })
  @ApiOkResponse({ type: AnalyticsResponseDto })
  getDashboard(): Promise<AnalyticsResponseDto> {
    return this.analytics.getDashboard();
  }
}
