import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Length, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Apparel', description: 'Unique display name' })
  @IsString()
  @Length(1, 50)
  name!: string;

  @ApiPropertyOptional({
    example: 'apparel',
    description: 'URL slug; derived from the name when omitted. An explicit collision returns 409.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  slug?: string;

  @ApiPropertyOptional({ example: 'Everyday essentials and seasonal pieces.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'https://picsum.photos/seed/apparel/600/400' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  imageUrl?: string;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Ascending display order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
