import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ example: 'cuid_abc123' })
  @IsString()
  @Length(1, 64)
  productId!: string;

  @ApiProperty({ example: 1, minimum: 1, description: 'Units to add (merged into any existing line)' })
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;
}
