import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

/**
 * Lean product projection for the wishlist. It is a read-only display shape, so it carries only
 * what the storefront needs to render a card (and never live-only internals). `description` is
 * intentionally omitted; the product detail page fetches the full product when needed.
 */
export class WishlistProductDto {
  @ApiProperty({ example: 'cuid_abc123' })
  id!: string;

  @ApiProperty({ example: 'Pine Fleece Hoodie' })
  name!: string;

  @ApiProperty({ example: 4500, description: 'Price in integer cents' })
  priceCents!: number;

  @ApiProperty({
    example: 5500,
    nullable: true,
    description: 'Optional strike-through "was" price in cents, or null when not on sale',
  })
  compareAtPriceCents!: number | null;

  @ApiProperty({ example: 'https://picsum.photos/seed/HOOD-001/600/400' })
  imageUrl!: string;

  @ApiProperty({ example: 'Apparel' })
  category!: string;

  @ApiProperty({ example: 60, description: 'Units available' })
  stock!: number;
}

export class WishlistItemDto {
  @ApiProperty({ example: 'cuid_wish123', description: 'Wishlist entry id' })
  id!: string;

  @ApiProperty({ type: WishlistProductDto })
  product!: WishlistProductDto;

  @ApiProperty({ type: String, format: 'date-time', description: 'When the product was wishlisted' })
  createdAt!: Date;
}

export class WishlistResponseDto {
  @ApiProperty({ type: WishlistItemDto, isArray: true })
  items!: WishlistItemDto[];

  @ApiProperty({ example: 3, description: 'Number of products on the wishlist' })
  itemCount!: number;
}

export class WishlistToggleResponseDto {
  @ApiProperty({ example: true, description: 'True if the product is now on the wishlist' })
  wishlisted!: boolean;
}

/** A wishlist row joined with its product. */
export type WishlistItemWithProduct = Prisma.WishlistItemGetPayload<{ include: { product: true } }>;

/** Map a wishlist row (with product) to the lean response shape. */
export function toWishlistItem(item: WishlistItemWithProduct): WishlistItemDto {
  return {
    id: item.id,
    createdAt: item.createdAt,
    product: {
      id: item.product.id,
      name: item.product.name,
      priceCents: item.product.priceCents,
      compareAtPriceCents: item.product.compareAtPriceCents,
      imageUrl: item.product.imageUrl,
      category: item.product.category,
      stock: item.product.stock,
    },
  };
}

/** Assemble the full wishlist response from joined rows (already ordered newest-first). */
export function buildWishlistResponse(items: WishlistItemWithProduct[]): WishlistResponseDto {
  const mapped = items.map(toWishlistItem);
  return { items: mapped, itemCount: mapped.length };
}
