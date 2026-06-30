import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** A gallery image to attach to a product. */
export class ProductImageInputDto {
  @ApiProperty({ example: 'https://picsum.photos/seed/tee-back/600/400' })
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  url!: string;

  @ApiPropertyOptional({ example: 'Back view of the tee' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;

  @ApiPropertyOptional({ example: 0, description: 'Gallery display order (ascending)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

/** A purchasable variant of a product (e.g. a size/colour combination). */
export class ProductVariantInputDto {
  @ApiProperty({ example: 'Black / M', description: 'Human-readable variant label' })
  @IsString()
  @Length(1, 100)
  label!: string;

  @ApiPropertyOptional({ example: 'Black' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ example: 'M' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  size?: string;

  @ApiProperty({ example: 4500, description: 'Variant price in integer cents' })
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceCents!: number;

  @ApiProperty({ example: 12, description: 'Variant units in stock' })
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiProperty({ example: 'TEE-010-BLK-M', description: 'Unique variant SKU (non-empty)' })
  @IsString()
  @Length(1, 64)
  sku!: string;

  @ApiPropertyOptional({ example: 0, description: 'Display order within the product' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateProductDto {
  @ApiProperty({ example: 'TEE-010', description: 'Unique stock-keeping unit' })
  @IsString()
  @Length(1, 64)
  sku!: string;

  @ApiProperty({ example: 'Classic Cotton Tee' })
  @IsString()
  @Length(1, 200)
  name!: string;

  @ApiProperty({ example: 'A soft, breathable everyday t-shirt.' })
  @IsString()
  @Length(1, 2000)
  description!: string;

  @ApiProperty({ example: 1999, description: 'Price in integer cents' })
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceCents!: number;

  @ApiPropertyOptional({
    example: 2999,
    description: 'Strike-through "was" price in integer cents (must be > 0). Omit when not on sale.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  compareAtPriceCents?: number;

  @ApiProperty({ example: 'https://picsum.photos/seed/tee/600/400' })
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  imageUrl!: string;

  @ApiProperty({ example: 'Apparel' })
  @IsString()
  @Length(1, 50)
  category!: string;

  @ApiProperty({ example: 100, description: 'Units in stock' })
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional({ type: ProductImageInputDto, isArray: true, description: 'Gallery images' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageInputDto)
  images?: ProductImageInputDto[];

  @ApiPropertyOptional({ type: ProductVariantInputDto, isArray: true, description: 'Variants' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants?: ProductVariantInputDto[];
}
