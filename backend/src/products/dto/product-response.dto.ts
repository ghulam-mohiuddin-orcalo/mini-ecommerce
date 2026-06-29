import { ApiProperty } from '@nestjs/swagger';
import { Product } from '@prisma/client';

export class ProductResponseDto {
  @ApiProperty({ example: 'cuid_abc123' })
  id!: string;

  @ApiProperty({ example: 'Pine Fleece Hoodie' })
  name!: string;

  @ApiProperty({ example: 'Cozy brushed-fleece hoodie with a roomy front pocket.' })
  description!: string;

  @ApiProperty({ example: 4500, description: 'Price in integer cents' })
  priceCents!: number;

  @ApiProperty({ example: 'https://picsum.photos/seed/HOOD-001/600/400' })
  imageUrl!: string;

  @ApiProperty({ example: 'Apparel' })
  category!: string;

  @ApiProperty({ example: 60, description: 'Units available' })
  stock!: number;

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

/** Map a Prisma Product row to the public response shape. */
export function toProductResponse(product: Product): ProductResponseDto {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    imageUrl: product.imageUrl,
    category: product.category,
    stock: product.stock,
    createdAt: product.createdAt,
  };
}
