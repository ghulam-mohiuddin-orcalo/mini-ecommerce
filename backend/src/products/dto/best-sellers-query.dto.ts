import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Query params for the public best-sellers rail. */
export class BestSellersQueryDto {
  @ApiPropertyOptional({ default: 4, minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  limit?: number = 4;

  @ApiPropertyOptional({
    default: 90,
    minimum: 1,
    maximum: 365,
    description: 'Rolling sales window in days',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  windowDays?: number = 90;
}
