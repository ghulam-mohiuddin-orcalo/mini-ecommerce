import { ApiProperty } from '@nestjs/swagger';
import { Category } from '@prisma/client';

/** Public/admin view of a category. `productCount` is supplied by the caller (active-only for the
 * storefront, total for admin) since the meaning of the count differs between the two surfaces. */
export class CategoryResponseDto {
  @ApiProperty({ example: 'cuid_abc123' })
  id!: string;

  @ApiProperty({ example: 'Apparel' })
  name!: string;

  @ApiProperty({ example: 'apparel', description: 'URL slug' })
  slug!: string;

  @ApiProperty({ example: 'Everyday essentials and seasonal pieces.', nullable: true, type: String })
  description!: string | null;

  @ApiProperty({
    example: 'https://picsum.photos/seed/apparel/600/400',
    nullable: true,
    type: String,
    description: 'Optional hero/card image URL',
  })
  imageUrl!: string | null;

  @ApiProperty({ example: true, description: 'Whether the category is shown in the storefront' })
  isActive!: boolean;

  @ApiProperty({ example: 0, description: 'Ascending display order in the storefront grid' })
  sortOrder!: number;

  @ApiProperty({ example: 12, description: 'Number of products in this category' })
  productCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedAdminCategoriesDto {
  @ApiProperty({ type: CategoryResponseDto, isArray: true })
  data!: CategoryResponseDto[];

  @ApiProperty()
  meta!: { page: number; pageSize: number; total: number; totalPages: number };
}

/** Map a Category row to the response shape. `productCount` is passed in by the caller (its
 * meaning — active-only vs. total — is decided at the call site). */
export function toCategoryResponse(category: Category, productCount: number): CategoryResponseDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    productCount,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}
