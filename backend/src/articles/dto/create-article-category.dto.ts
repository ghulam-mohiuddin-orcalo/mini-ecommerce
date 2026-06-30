import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateArticleCategoryDto {
  @ApiProperty({ example: 'Style Guides' })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiPropertyOptional({
    example: 'style-guides',
    description: 'URL slug; derived from the name when omitted',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  slug?: string;
}
