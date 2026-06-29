import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ example: 2, minimum: 1, description: 'Absolute new quantity for the line' })
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;
}
