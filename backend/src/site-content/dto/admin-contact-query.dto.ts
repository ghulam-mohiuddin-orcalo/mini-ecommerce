import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class AdminContactQueryDto {
  // NOTE: kept as a validated STRING rather than a boolean. The global ValidationPipe runs with
  // `transformOptions.enableImplicitConversion: true`, which coerces a boolean-typed property from
  // the query string via Boolean(value) — turning the string 'false' into `true` and inverting the
  // filter. Parsing the string ourselves in the service sidesteps that coercion entirely.
  @ApiPropertyOptional({
    enum: ['true', 'false'],
    description: "Filter by handled flag ('true' | 'false'). Omit to return both.",
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  handled?: string;

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
