import { ApiProperty } from '@nestjs/swagger';
import { Review } from '@prisma/client';
import { PaginationMetaDto } from '../../products/dto/product-response.dto';

/**
 * Public shape of a single review. Deliberately exposes only the reviewer's display name —
 * never their email or user id — so listing reviews can't be used to harvest accounts.
 */
export class ReviewResponseDto {
  @ApiProperty({ example: 'cuid_rev123' })
  id!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Star rating, 1 to 5' })
  rating!: number;

  @ApiProperty({ example: 'Cozy and well made', nullable: true, type: String })
  title!: string | null;

  @ApiProperty({ example: 'Soft fleece, true to size, and arrived quickly.' })
  body!: string;

  @ApiProperty({ example: 'Jordan A.', description: 'Reviewer display name (no email/id exposed)' })
  userName!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class PaginatedReviewsDto {
  @ApiProperty({ type: ReviewResponseDto, isArray: true })
  data!: ReviewResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

/** A featured review (for the storefront testimonials band) — carries minimal product context. */
export class FeaturedReviewProductDto {
  @ApiProperty({ example: 'cuid_abc123' }) id!: string;
  @ApiProperty({ example: 'Pine Fleece Hoodie' }) name!: string;
  @ApiProperty({ example: 'https://picsum.photos/seed/HOOD-001/600/400' }) imageUrl!: string;
}

export class FeaturedReviewDto extends ReviewResponseDto {
  @ApiProperty({ type: FeaturedReviewProductDto })
  product!: FeaturedReviewProductDto;
}

/** A Review row joined with just the author's display name. */
export type ReviewWithAuthor = Review & { user: { name: string } };

/** A Review row joined with author name + minimal product context (for featured testimonials). */
export type ReviewWithAuthorAndProduct = ReviewWithAuthor & {
  product: { id: string; name: string; imageUrl: string };
};

/** Map a Review (+ joined author name) to the public response shape — strips everything else. */
export function toReviewResponse(review: ReviewWithAuthor): ReviewResponseDto {
  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    body: review.body,
    userName: review.user.name,
    createdAt: review.createdAt,
  };
}

/** Map a Review (+ author + product) to the featured testimonial shape. */
export function toFeaturedReview(review: ReviewWithAuthorAndProduct): FeaturedReviewDto {
  return {
    ...toReviewResponse(review),
    product: {
      id: review.product.id,
      name: review.product.name,
      imageUrl: review.product.imageUrl,
    },
  };
}
