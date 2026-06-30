import { ApiProperty } from '@nestjs/swagger';
import { Article, ArticleCategory } from '@prisma/client';

/** A category reference embedded in an article response. */
export class ArticleCategoryRefDto {
  @ApiProperty({ example: 'style-guides' })
  slug!: string;

  @ApiProperty({ example: 'Style Guides' })
  name!: string;
}

/** Full public article — only ever populated for PUBLISHED content. */
export class ArticleResponseDto {
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

  @ApiProperty({
    type: ArticleCategoryRefDto,
    nullable: true,
    description: 'Owning category, or null when uncategorised',
  })
  category!: ArticleCategoryRefDto | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

/** Lean shape for listings — omits the (potentially large) body. */
export class ArticleListItemDto {
  @ApiProperty({ example: 'cuid_abc123' })
  id!: string;

  @ApiProperty({ example: 'styling-your-autumn-wardrobe' })
  slug!: string;

  @ApiProperty({ example: 'Styling Your Autumn Wardrobe' })
  title!: string;

  @ApiProperty({ example: 'A short, punchy summary shown in listings.' })
  excerpt!: string;

  @ApiProperty({ example: 'https://picsum.photos/seed/journal-1/1200/630' })
  coverUrl!: string;

  @ApiProperty({ example: 'Jane Doe' })
  author!: string;

  @ApiProperty({ type: ArticleCategoryRefDto, nullable: true })
  category!: ArticleCategoryRefDto | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt!: Date | null;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 12 }) pageSize!: number;
  @ApiProperty({ example: 14 }) total!: number;
  @ApiProperty({ example: 2 }) totalPages!: number;
}

export class PaginatedArticlesDto {
  @ApiProperty({ type: ArticleListItemDto, isArray: true })
  data!: ArticleListItemDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

/** An article category that has at least one published article, with the published count. */
export class ArticleCategoryWithCountDto {
  @ApiProperty({ example: 'cuid_cat123' })
  id!: string;

  @ApiProperty({ example: 'style-guides' })
  slug!: string;

  @ApiProperty({ example: 'Style Guides' })
  name!: string;

  @ApiProperty({ example: 4, description: 'Number of published articles in this category' })
  count!: number;
}

/** An article row that may have its category relation loaded. */
type ArticleWithCategory = Article & { category?: ArticleCategory | null };

function toCategoryRef(category: ArticleCategory | null | undefined): ArticleCategoryRefDto | null {
  return category ? { slug: category.slug, name: category.name } : null;
}

/** Map a Prisma Article (+ optional category) to the full public response shape. */
export function toArticleResponse(article: ArticleWithCategory): ArticleResponseDto {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    body: article.body,
    coverUrl: article.coverUrl,
    author: article.author,
    category: toCategoryRef(article.category),
    publishedAt: article.publishedAt,
    createdAt: article.createdAt,
  };
}

/** Map a Prisma Article (+ optional category) to the lean listing shape. */
export function toArticleListItem(article: ArticleWithCategory): ArticleListItemDto {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    coverUrl: article.coverUrl,
    author: article.author,
    category: toCategoryRef(article.category),
    publishedAt: article.publishedAt,
  };
}
