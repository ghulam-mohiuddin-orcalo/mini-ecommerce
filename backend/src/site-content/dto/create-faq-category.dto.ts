import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

export class CreateFaqCategoryDto {
  @ApiProperty({ example: 'Orders & Shipping', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiPropertyOptional({
    example: 'orders-shipping',
    description: 'URL slug (lowercase letters, numbers, hyphens). Defaults to a slugified name.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric words separated by hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 0, description: 'Display order (ascending)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

/** Patch a FAQ category — any subset of the create fields. */
export class UpdateFaqCategoryDto extends PartialType(CreateFaqCategoryDto) {}
