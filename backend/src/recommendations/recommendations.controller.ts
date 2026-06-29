import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { RecommendationsResponseDto } from './dto/recommendations-response.dto';
import { RecommendationsService } from './recommendations.service';

@ApiTags('recommendations')
@Public() // open to guests; personalizes when an auth cookie is present
@UseGuards(OptionalJwtAuthGuard) // attaches the user if signed in, never rejects
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Get()
  @ApiOperation({ summary: 'Personalized suggestions (purchase history → cart → top sellers)' })
  @ApiOkResponse({ type: RecommendationsResponseDto })
  getForUser(@CurrentUser() user?: AuthenticatedUser): Promise<RecommendationsResponseDto> {
    return this.recommendations.getForUser(user?.id);
  }

  @Get('related/:productId')
  @ApiOperation({ summary: 'Related products in the same category as the given product' })
  @ApiOkResponse({ type: RecommendationsResponseDto })
  getRelated(@Param('productId') productId: string): Promise<RecommendationsResponseDto> {
    return this.recommendations.getRelated(productId);
  }
}
