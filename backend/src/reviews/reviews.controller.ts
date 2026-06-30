import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import {
  FeaturedReviewDto,
  PaginatedReviewsDto,
  ReviewResponseDto,
} from './dto/review-response.dto';
import { ReviewsService } from './reviews.service';

/**
 * Review routes. Listing and creating are nested under a product; deletion is keyed by the
 * review id. Auth is the global JwtAuthGuard — the public list opts out via @Public(), the
 * mutations require a signed-in user (eligibility/ownership enforced in the service).
 */
@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('reviews/featured')
  @Public()
  @ApiOperation({ summary: 'Top-rated recent reviews across the catalog (testimonials)' })
  @ApiOkResponse({ type: FeaturedReviewDto, isArray: true })
  featured(@Query('limit') limit?: string): Promise<FeaturedReviewDto[]> {
    const parsed = limit ? Number(limit) : undefined;
    return this.reviews.featured(parsed && Number.isFinite(parsed) ? parsed : undefined);
  }

  @Get('products/:productId/reviews')
  @Public()
  @ApiOperation({ summary: "A product's reviews, newest first (paginated)" })
  @ApiOkResponse({ type: PaginatedReviewsDto })
  list(
    @Param('productId') productId: string,
    @Query() query: ReviewQueryDto,
  ): Promise<PaginatedReviewsDto> {
    return this.reviews.listForProduct(productId, query);
  }

  @Post('products/:productId/reviews')
  @ApiOperation({ summary: 'Review a product you have purchased (verified-purchase gated)' })
  @ApiCreatedResponse({ type: ReviewResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviews.create(user.id, productId, dto);
  }

  @Delete('reviews/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a review (author or admin only)' })
  @ApiNoContentResponse({ description: 'Review deleted' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.reviews.remove(user.id, user.role === Role.ADMIN, id);
  }
}
