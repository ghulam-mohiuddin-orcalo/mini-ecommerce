import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateFaqItemDto {
  @ApiProperty({ example: 'clx123category', description: 'Owning FAQ category id' })
  @IsString()
  @Length(1, 64)
  categoryId!: string;

  @ApiProperty({ example: 'How long does shipping take?', minLength: 1, maxLength: 300 })
  @IsString()
  @Length(1, 300)
  question!: string;

  @ApiProperty({ example: 'Most orders arrive in 3-5 business days.', minLength: 1, maxLength: 5000 })
  @IsString()
  @Length(1, 5000)
  body!: string;

  @ApiPropertyOptional({ example: 0, description: 'Display order within the category', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

/**
 * Patch a FAQ item — any subset of the create fields. `categoryId` may be supplied to move the
 * item to another category.
 */
export class UpdateFaqItemDto extends PartialType(CreateFaqItemDto) {}
