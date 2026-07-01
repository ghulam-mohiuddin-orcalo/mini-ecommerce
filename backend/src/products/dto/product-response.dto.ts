import { ApiProperty } from '@nestjs/swagger';
import { Category, Product, ProductImage, ProductVariant } from '@prisma/client';

/** Derived, never-stored merchandising badges. See `deriveBadges` for the rules. */
export type ProductBadge = 'NEW' | 'SALE' | 'BESTSELLER' | 'TRENDING';

/** Nested category reference on a product — the storefront filters/links by slug. */
export class ProductCategoryRefDto {
  @ApiProperty({ example: 'cuid_cat123' })
  id!: string;

  @ApiProperty({ example: 'Apparel' })
  name!: string;

  @ApiProperty({ example: 'apparel', description: 'URL slug; the ?category= filter matches on this' })
  slug!: string;
}

/** A product's age (in days) under which the NEW badge applies. */
const NEW_WINDOW_DAYS = 30;

export class ProductImageResponseDto {
  @ApiProperty({ example: 'https://picsum.photos/seed/HOOD-001/600/400' })
  url!: string;

  @ApiProperty({ example: 'Front view of the hoodie', nullable: true, type: String })
  alt!: string | null;
}

export class ProductVariantResponseDto {
  @ApiProperty({ example: 'cuid_var123' })
  id!: string;

  @ApiProperty({ example: 'Black / M' })
  label!: string;

  @ApiProperty({ example: 'Black', nullable: true, type: String })
  color!: string | null;

  @ApiProperty({ example: 'M', nullable: true, type: String })
  size!: string | null;

  @ApiProperty({ example: 4500, description: 'Variant price in integer cents' })
  priceCents!: number;

  @ApiProperty({ example: 12, description: 'Units available for this variant' })
  stock!: number;

  @ApiProperty({ example: 'HOOD-001-BLK-M' })
  sku!: string;
}

export class ProductResponseDto {
  @ApiProperty({ example: 'cuid_abc123' })
  id!: string;

  @ApiProperty({ example: 'Pine Fleece Hoodie' })
  name!: string;

  @ApiProperty({ example: 'Cozy brushed-fleece hoodie with a roomy front pocket.' })
  description!: string;

  @ApiProperty({ example: 4500, description: 'Price in integer cents' })
  priceCents!: number;

  @ApiProperty({
    example: 5500,
    nullable: true,
    type: Number,
    description: 'Strike-through "was" price in integer cents; null when not on sale',
  })
  compareAtPriceCents!: number | null;

  @ApiProperty({ example: 'https://picsum.photos/seed/HOOD-001/600/400' })
  imageUrl!: string;

  @ApiProperty({ type: ProductCategoryRefDto, description: 'The product\'s category' })
  category!: ProductCategoryRefDto;

  @ApiProperty({ example: 60, description: 'Units available' })
  stock!: number;

  @ApiProperty({
    type: ProductImageResponseDto,
    isArray: true,
    description: 'Gallery images ordered by position; falls back to the primary image',
  })
  images!: ProductImageResponseDto[];

  @ApiProperty({
    type: ProductVariantResponseDto,
    isArray: true,
    description: 'Active variants ordered by position; empty when the product has none',
  })
  variants!: ProductVariantResponseDto[];

  @ApiProperty({ example: 4.5, description: 'Average rating (0 when no reviews)' })
  ratingAvg!: number;

  @ApiProperty({ example: 23, description: 'Number of reviews' })
  ratingCount!: number;

  @ApiProperty({
    example: ['SALE', 'BESTSELLER'],
    isArray: true,
    enum: ['NEW', 'SALE', 'BESTSELLER', 'TRENDING'],
    description: 'Derived merchandising badges (never stored)',
  })
  badges!: ProductBadge[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 12 }) pageSize!: number;
  @ApiProperty({ example: 14 }) total!: number;
  @ApiProperty({ example: 2 }) totalPages!: number;
}

export class PaginatedProductsDto {
  @ApiProperty({ type: ProductResponseDto, isArray: true })
  data!: ProductResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

/**
 * Optional enrichment passed alongside the bare Product row. Callers that have the relations
 * loaded (the catalog) supply these; lightweight callers (recommendations) omit them and get a
 * sensible, non-N+1 fallback (primary image only, no variants, no ratings).
 */
export interface ProductEnrichment {
  images?: Pick<ProductImage, 'url' | 'alt'>[];
  variants?: Pick<ProductVariant, 'id' | 'label' | 'color' | 'size' | 'priceCents' | 'stock' | 'sku'>[];
  ratingAvg?: number;
  ratingCount?: number;
  /** Total units sold across non-cancelled orders — drives BESTSELLER/TRENDING. */
  unitsSold?: number;
}

/**
 * Derive merchandising badges from authoritative fields — badges are NEVER stored.
 *  - SALE:        compareAtPriceCents is set and strictly greater than priceCents.
 *  - NEW:         created within the last NEW_WINDOW_DAYS days.
 *  - BESTSELLER:  has sold a meaningful number of units.
 *  - TRENDING:    has some recent traction (a lower bar than BESTSELLER).
 * BESTSELLER and TRENDING share the unitsSold signal; BESTSELLER implies the higher threshold.
 */
function deriveBadges(product: Product, unitsSold: number): ProductBadge[] {
  const badges: ProductBadge[] = [];

  if (product.compareAtPriceCents != null && product.compareAtPriceCents > product.priceCents) {
    badges.push('SALE');
  }

  const ageMs = Date.now() - product.createdAt.getTime();
  if (ageMs <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
    badges.push('NEW');
  }

  // Units-sold thresholds are intentionally simple and explainable (no opaque scoring),
  // matching the deterministic spirit of the recommendations service.
  if (unitsSold >= 20) {
    badges.push('BESTSELLER');
  } else if (unitsSold >= 5) {
    badges.push('TRENDING');
  }

  return badges;
}

/**
 * A Product row with its `category` relation loaded — every caller of `toProductResponse` must
 * `include: { category: true }` so the nested `{ id, name, slug }` reference can be emitted.
 */
export type ProductWithCategory = Product & {
  category: Pick<Category, 'id' | 'name' | 'slug'>;
};

/** Map a Prisma Product row (+ loaded category, + optional enrichment) to the public shape. */
export function toProductResponse(
  product: ProductWithCategory,
  enrichment: ProductEnrichment = {},
): ProductResponseDto {
  const images =
    enrichment.images && enrichment.images.length > 0
      ? enrichment.images.map((image) => ({ url: image.url, alt: image.alt }))
      : // Gallery always has at least the primary image so the UI never renders empty.
        [{ url: product.imageUrl, alt: product.name }];

  const variants = (enrichment.variants ?? []).map((variant) => ({
    id: variant.id,
    label: variant.label,
    color: variant.color,
    size: variant.size,
    priceCents: variant.priceCents,
    stock: variant.stock,
    sku: variant.sku,
  }));

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    compareAtPriceCents: product.compareAtPriceCents,
    imageUrl: product.imageUrl,
    category: {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug,
    },
    stock: product.stock,
    images,
    variants,
    ratingAvg: enrichment.ratingAvg ?? 0,
    ratingCount: enrichment.ratingCount ?? 0,
    badges: deriveBadges(product, enrichment.unitsSold ?? 0),
    createdAt: product.createdAt,
  };
}
