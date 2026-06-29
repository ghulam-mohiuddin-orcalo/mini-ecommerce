import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from '../../products/dto/product-response.dto';

/**
 * Which rule produced the list. Returned to the client so the feature is fully explainable
 * (and so tests can assert *why* a list was chosen, not just its contents).
 */
export enum RecommendationStrategy {
  /** Popular products in categories the customer has previously purchased. */
  PURCHASE_HISTORY = 'PURCHASE_HISTORY',
  /** No order history → popular products in categories currently in the cart. */
  CART = 'CART',
  /** No history or cart signal → global top sellers (topped up with newest). */
  TOP_SELLERS = 'TOP_SELLERS',
  /** Product-detail context → other active products in the same category. */
  RELATED_CATEGORY = 'RELATED_CATEGORY',
  /** Nothing to recommend (e.g. an empty catalog). */
  NONE = 'NONE',
}

export class RecommendationsResponseDto {
  @ApiProperty({ enum: RecommendationStrategy, description: 'Why these products were chosen' })
  strategy!: RecommendationStrategy;

  @ApiProperty({ type: ProductResponseDto, isArray: true })
  items!: ProductResponseDto[];
}
