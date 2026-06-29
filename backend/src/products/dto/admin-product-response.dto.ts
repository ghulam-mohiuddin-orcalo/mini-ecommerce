import { ApiProperty } from '@nestjs/swagger';
import { Product } from '@prisma/client';

/** Admin view of a product — includes sku and isActive (hidden from the public DTO). */
export class AdminProductResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() priceCents!: number;
  @ApiProperty() imageUrl!: string;
  @ApiProperty() category!: string;
  @ApiProperty() stock!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class PaginatedAdminProductsDto {
  @ApiProperty({ type: AdminProductResponseDto, isArray: true })
  data!: AdminProductResponseDto[];
  @ApiProperty()
  meta!: { page: number; pageSize: number; total: number; totalPages: number };
}

export function toAdminProductResponse(product: Product): AdminProductResponseDto {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    imageUrl: product.imageUrl,
    category: product.category,
    stock: product.stock,
    isActive: product.isActive,
    createdAt: product.createdAt,
  };
}
