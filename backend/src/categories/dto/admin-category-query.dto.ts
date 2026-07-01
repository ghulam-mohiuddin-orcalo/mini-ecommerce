import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Status filter for the admin category listing. */
export enum CategoryStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * Sort options for the admin category listing. Values are `<field>_<direction>` so the client
 * can offer explicit direction toggles (and a "most products" order) — kept in lock-step with the
 * admin UI's sort dropdown.
 */
export enum CategorySort {
  SORT_ORDER_ASC = 'sortOrder_asc',
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  CREATED_DESC = 'created_desc',
  CREATED_ASC = 'created_asc',
  PRODUCTS_DESC = 'products_desc',
}

export class AdminCategoryQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive match on name or slug', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: CategoryStatusFilter, description: 'Filter by active/inactive' })
  @IsOptional()
  @IsEnum(CategoryStatusFilter)
  status?: CategoryStatusFilter;

  @ApiPropertyOptional({ enum: CategorySort, default: CategorySort.SORT_ORDER_ASC })
  @IsOptional()
  @IsEnum(CategorySort)
  sort?: CategorySort = CategorySort.SORT_ORDER_ASC;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
