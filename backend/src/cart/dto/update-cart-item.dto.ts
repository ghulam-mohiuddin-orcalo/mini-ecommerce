import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ example: 2, minimum: 1, description: 'Absolute new quantity for the line' })
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;

  @ApiPropertyOptional({
    example: 'cuid_variant123',
    description: 'Identifies which variant line to update. Omit for products without variants.',
  })
  @IsOptional()
  @IsString()
  variantId?: string;
}
