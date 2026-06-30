import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';

export class CreateArticleDto {
  @ApiProperty({ example: 'Styling Your Autumn Wardrobe' })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiProperty({ example: 'A short, punchy summary shown in listings and previews.' })
  @IsString()
  @Length(1, 500)
  excerpt!: string;

  @ApiProperty({ example: '## Heading\n\nMarkdown / rich-text body of the article.' })
  @IsString()
  @Length(1, 50_000)
  body!: string;

  @ApiProperty({ example: 'https://picsum.photos/seed/journal-1/1200/630' })
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  coverUrl!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @Length(1, 120)
  author!: string;

  @ApiPropertyOptional({
    example: 'styling-your-autumn-wardrobe',
    description: 'URL slug; derived from the title when omitted',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  slug?: string;

  @ApiPropertyOptional({ example: 'cuid_cat123', description: 'Owning article category id' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  categoryId?: string;

  @ApiPropertyOptional({
    enum: ArticleStatus,
    default: ArticleStatus.DRAFT,
    description: 'Publication status; defaults to DRAFT',
  })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;
}
