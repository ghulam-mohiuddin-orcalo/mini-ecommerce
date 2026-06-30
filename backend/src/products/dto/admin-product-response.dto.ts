import { ApiProperty } from '@nestjs/swagger';
import { Product, ProductImage, ProductVariant } from '@prisma/client';

/** Admin view of a gallery image — includes id/position so the UI can manage ordering. */
export class AdminProductImageDto {
  @ApiProperty() id!: string;
  @ApiProperty() url!: string;
  @ApiProperty({ nullable: true, type: String }) alt!: string | null;
  @ApiProperty({ example: 0 }) position!: number;
}

/** Admin view of a variant — includes sku/isActive/position (full management surface). */
export class AdminProductVariantDto {
  @ApiProperty() id!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ nullable: true, type: String }) color!: string | null;
  @ApiProperty({ nullable: true, type: String }) size!: string | null;
  @ApiProperty({ description: 'Variant price in integer cents' }) priceCents!: number;
  @ApiProperty() stock!: number;
  @ApiProperty() sku!: string;
  @ApiProperty({ example: 0 }) position!: number;
  @ApiProperty() isActive!: boolean;
}

/** Admin view of a product — includes sku and isActive (hidden from the public DTO). */
export class AdminProductResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() priceCents!: number;
  @ApiProperty({ nullable: true, type: Number, description: 'Strike-through price in cents' })
  compareAtPriceCents!: number | null;
  @ApiProperty() imageUrl!: string;
  @ApiProperty() category!: string;
  @ApiProperty() stock!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: AdminProductImageDto, isArray: true }) images!: AdminProductImageDto[];
  @ApiProperty({ type: AdminProductVariantDto, isArray: true }) variants!: AdminProductVariantDto[];
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class PaginatedAdminProductsDto {
  @ApiProperty({ type: AdminProductResponseDto, isArray: true })
  data!: AdminProductResponseDto[];
  @ApiProperty()
  meta!: { page: number; pageSize: number; total: number; totalPages: number };
}

/** A product row with its gallery + variants loaded (the shape admin queries return). */
type AdminProductInput = Product & {
  images?: ProductImage[];
  variants?: ProductVariant[];
};

export function toAdminProductResponse(product: AdminProductInput): AdminProductResponseDto {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    compareAtPriceCents: product.compareAtPriceCents,
    imageUrl: product.imageUrl,
    category: product.category,
    stock: product.stock,
    isActive: product.isActive,
    images: (product.images ?? []).map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      position: image.position,
    })),
    variants: (product.variants ?? []).map((variant) => ({
      id: variant.id,
      label: variant.label,
      color: variant.color,
      size: variant.size,
      priceCents: variant.priceCents,
      stock: variant.stock,
      sku: variant.sku,
      position: variant.position,
      isActive: variant.isActive,
    })),
    createdAt: product.createdAt,
  };
}
