import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import {
  FeaturedReviewDto,
  PaginatedReviewsDto,
  ReviewResponseDto,
  toFeaturedReview,
  toReviewResponse,
} from './dto/review-response.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A product's reviews, newest first, paginated. Each row is joined to the author's display
   * NAME only — never email or id — so listing reviews can't leak account identifiers. Data and
   * total count run in a single round trip, matching the products listing pattern.
   */
  async listForProduct(productId: string, query: ReviewQueryDto): Promise<PaginatedReviewsDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: Prisma.ReviewWhereInput = { productId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: items.map(toReviewResponse),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * Top-rated recent reviews across the catalog, for the storefront testimonials band. Only
   * 4–5 star reviews on active products are surfaced, highest-rated then newest first. Real data
   * — never fabricated quotes. Author name only; minimal product context for linking.
   */
  async featured(limit = 6): Promise<FeaturedReviewDto[]> {
    const take = Math.min(Math.max(limit, 1), 12);
    const reviews = await this.prisma.review.findMany({
      where: { rating: { gte: 4 }, product: { isActive: true } },
      include: {
        user: { select: { name: true } },
        product: { select: { id: true, name: true, imageUrl: true } },
      },
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      take,
    });
    return reviews.map(toFeaturedReview);
  }

  /**
   * Create a review for a product. Two server-enforced gates:
   *
   *  1. The product must exist AND be active (404 otherwise) — no reviewing soft-deleted items.
   *  2. ELIGIBILITY (verified purchase): the user must have a PAID order (`paidAt` set) that
   *     contains an OrderItem for this product. Without a paid purchase → 403. This is a real
   *     check against authoritative order data, never trust of the client.
   *
   * One review per user per product is enforced by the DB `@@unique([productId, userId])`; a
   * duplicate surfaces as Prisma P2002, which we translate to a 409 with a clear message rather
   * than race-prone pre-checking.
   */
  async create(userId: string, productId: string, dto: CreateReviewDto): Promise<ReviewResponseDto> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verified-purchase gate: a paid order (paidAt set) that includes this product.
    const purchased = await this.prisma.orderItem.findFirst({
      where: { productId, order: { userId, paidAt: { not: null } } },
      select: { id: true },
    });
    if (!purchased) {
      throw new ForbiddenException('You can only review products you have purchased');
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          productId,
          userId,
          rating: dto.rating,
          title: dto.title ?? null,
          body: dto.body,
        },
        include: { user: { select: { name: true } } },
      });
      return toReviewResponse(review);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('You have already reviewed this product');
      }
      throw e;
    }
  }

  /**
   * Delete a review. Permitted only when the requester OWNS the review or is an ADMIN; any other
   * user gets 403 (and 404 if the review doesn't exist). Ownership-checked so there's no IDOR.
   */
  async remove(userId: string, isAdmin: boolean, reviewId: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { userId: true },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (!isAdmin && review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own review');
    }

    await this.prisma.review.delete({ where: { id: reviewId } });
  }
}
