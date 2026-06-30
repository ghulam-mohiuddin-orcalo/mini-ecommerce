import { ApiProperty } from '@nestjs/swagger';
import { Article, ArticleCategory, ArticleStatus } from '@prisma/client';
import { ArticleCategoryRefDto } from './article-response.dto';

/** Admin view of an article — includes status and draft-only fields. */
export class AdminArticleResponseDto {
  @ApiProperty({ example: 'cuid_abc123' })
  id!: string;

  @ApiProperty({ example: 'styling-your-autumn-wardrobe' })
  slug!: string;

  @ApiProperty({ example: 'Styling Your Autumn Wardrobe' })
  title!: string;

  @ApiProperty({ example: 'A short, punchy summary shown in listings.' })
  excerpt!: string;

  @ApiProperty({ example: '## Heading\n\nMarkdown body.' })
  body!: string;

  @ApiProperty({ example: 'https://picsum.photos/seed/journal-1/1200/630' })
  coverUrl!: string;

  @ApiProperty({ example: 'Jane Doe' })
  author!: string;

  @ApiProperty({ enum: ArticleStatus, example: ArticleStatus.DRAFT })
  status!: ArticleStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt!: Date | null;

  @ApiProperty({ example: 'cuid_cat123', nullable: true, type: String })
  categoryId!: string | null;

  @ApiProperty({ type: ArticleCategoryRefDto, nullable: true })
  category!: ArticleCategoryRefDto | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class PaginatedAdminArticlesDto {
  @ApiProperty({ type: AdminArticleResponseDto, isArray: true })
  data!: AdminArticleResponseDto[];

  @ApiProperty()
  meta!: { page: number; pageSize: number; total: number; totalPages: number };
}

type AdminArticleInput = Article & { category?: ArticleCategory | null };

export function toAdminArticleResponse(article: AdminArticleInput): AdminArticleResponseDto {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    body: article.body,
    coverUrl: article.coverUrl,
    author: article.author,
    status: article.status,
    publishedAt: article.publishedAt,
    categoryId: article.categoryId,
    category: article.category
      ? { slug: article.category.slug, name: article.category.name }
      : null,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
  };
}
