import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Validated body for creating (or updating in place) a product review. */
export class CreateReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Star rating, 1 to 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Cozy and well made', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title?: string;

  @ApiProperty({ example: 'Soft fleece, true to size, and arrived quickly.', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  body!: string;
}
