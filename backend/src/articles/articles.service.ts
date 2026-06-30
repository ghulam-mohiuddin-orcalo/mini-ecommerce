import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ArticleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminArticleQueryDto } from './dto/admin-article-query.dto';
import {
  AdminArticleResponseDto,
  PaginatedAdminArticlesDto,
  toAdminArticleResponse,
} from './dto/admin-article-response.dto';
import { ArticleQueryDto } from './dto/article-query.dto';
import {
  ArticleCategoryWithCountDto,
  ArticleListItemDto,
  ArticleResponseDto,
  PaginatedArticlesDto,
  toArticleListItem,
  toArticleResponse,
} from './dto/article-response.dto';
import { CreateArticleCategoryDto } from './dto/create-article-category.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Public reads (PUBLISHED + publishedAt <= now only) --------------------------

  /**
   * Customer-facing journal listing. Only PUBLISHED articles whose publishedAt has already
   * passed are ever returned — scheduled/draft content never leaks. Search matches title or
   * excerpt; an optional category slug narrows the set. Data + count run in one round trip.
   */
  async findPublished(query: ArticleQueryDto): Promise<PaginatedArticlesDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const where = this.buildPublishedWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: items.map((a): ArticleListItemDto => toArticleListItem(a)),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /** A single PUBLISHED article by slug, or 404. Drafts/future posts are never exposed. */
  async findBySlug(slug: string): Promise<ArticleResponseDto> {
    const article = await this.prisma.article.findFirst({
      where: { slug, ...this.publishedFilter() },
      include: { category: true },
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return toArticleResponse(article);
  }

  /**
   * Related published articles for the article identified by `slug`: others in the same
   * category, newest first. Falls back to the most recent published articles when the source
   * article has no category. The source article is always excluded.
   */
  async findRelated(slug: string, limit = 3): Promise<ArticleListItemDto[]> {
    const source = await this.prisma.article.findFirst({
      where: { slug, ...this.publishedFilter() },
      select: { id: true, categoryId: true },
    });
    if (!source) {
      throw new NotFoundException('Article not found');
    }

    const where: Prisma.ArticleWhereInput = {
      ...this.publishedFilter(),
      id: { not: source.id },
      ...(source.categoryId ? { categoryId: source.categoryId } : {}),
    };

    const related = await this.prisma.article.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: { category: true },
    });

    return related.map((a) => toArticleListItem(a));
  }

  /** Article categories that have >=1 published article, with their published counts. */
  async listCategories(): Promise<ArticleCategoryWithCountDto[]> {
    const grouped = await this.prisma.article.groupBy({
      by: ['categoryId'],
      where: { ...this.publishedFilter(), categoryId: { not: null } },
      _count: { _all: true },
    });

    const categoryIds = grouped
      .map((g) => g.categoryId)
      .filter((id): id is string => id !== null);
    if (categoryIds.length === 0) return [];

    const categories = await this.prisma.articleCategory.findMany({
      where: { id: { in: categoryIds } },
      orderBy: { name: 'asc' },
    });

    const countById = new Map(grouped.map((g) => [g.categoryId, g._count._all]));

    return categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      count: countById.get(c.id) ?? 0,
    }));
  }

  // --- Admin (full access incl. drafts) --------------------------------------------

  /** All articles incl. drafts (admins manage the full journal), paginated. */
  async findAllForAdmin(query: AdminArticleQueryDto): Promise<PaginatedAdminArticlesDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.ArticleWhereInput = {};
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) {
      where.status = query.status;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: items.map(toAdminArticleResponse),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /** A single article (any status) by id, or 404. */
  async findOneForAdmin(id: string): Promise<AdminArticleResponseDto> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return toAdminArticleResponse(article);
  }

  /**
   * Create an article. The slug is taken from the payload or derived from the title and made
   * unique. When status is PUBLISHED and no publishedAt is implied, publishedAt is set to now.
   * A duplicate slug surfaces as Prisma P2002 -> 409 via the global filter.
   */
  async create(dto: CreateArticleDto): Promise<AdminArticleResponseDto> {
    const slug = await this.resolveSlugForWrite(dto.slug, dto.title);
    const status = dto.status ?? ArticleStatus.DRAFT;

    const article = await this.prisma.article.create({
      data: {
        slug,
        title: dto.title,
        excerpt: dto.excerpt,
        body: dto.body,
        coverUrl: dto.coverUrl,
        author: dto.author,
        status,
        publishedAt: status === ArticleStatus.PUBLISHED ? new Date() : null,
        categoryId: dto.categoryId ?? null,
      },
      include: { category: true },
    });
    return toAdminArticleResponse(article);
  }

  /**
   * Edit an article. Provided scalar fields are patched. Re-slugging is supported (explicit
   * slug, or implicitly when the title changes and no slug was ever customised — here we only
   * re-slug on an explicit slug to avoid breaking existing URLs). Toggling status keeps
   * publishedAt coherent: first publish stamps publishedAt; unpublish clears it.
   */
  async update(id: string, dto: UpdateArticleDto): Promise<AdminArticleResponseDto> {
    const existing = await this.prisma.article.findUnique({
      where: { id },
      select: { status: true, publishedAt: true },
    });
    if (!existing) {
      throw new NotFoundException('Article not found');
    }

    const data: Prisma.ArticleUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.coverUrl !== undefined) data.coverUrl = dto.coverUrl;
    if (dto.author !== undefined) data.author = dto.author;
    if (dto.categoryId !== undefined) {
      data.category = dto.categoryId
        ? { connect: { id: dto.categoryId } }
        : { disconnect: true };
    }
    if (dto.slug !== undefined) {
      data.slug = await this.resolveSlugForWrite(dto.slug, undefined, id);
    }
    if (dto.status !== undefined && dto.status !== existing.status) {
      data.status = dto.status;
      if (dto.status === ArticleStatus.PUBLISHED) {
        // Stamp publishedAt on first publish; keep an existing timestamp if re-publishing.
        data.publishedAt = existing.publishedAt ?? new Date();
      } else {
        data.publishedAt = null;
      }
    }

    const article = await this.prisma.article.update({
      where: { id },
      data,
      include: { category: true },
    });
    return toAdminArticleResponse(article);
  }

  /** Hard-delete an article (journal content has no order references to protect). */
  async remove(id: string): Promise<{ id: string }> {
    await this.ensureExists(id);
    await this.prisma.article.delete({ where: { id } });
    return { id };
  }

  /** Publish an article: set PUBLISHED and stamp publishedAt (preserving an existing stamp). */
  async publish(id: string): Promise<AdminArticleResponseDto> {
    const existing = await this.prisma.article.findUnique({
      where: { id },
      select: { publishedAt: true },
    });
    if (!existing) {
      throw new NotFoundException('Article not found');
    }
    const article = await this.prisma.article.update({
      where: { id },
      data: {
        status: ArticleStatus.PUBLISHED,
        publishedAt: existing.publishedAt ?? new Date(),
      },
      include: { category: true },
    });
    return toAdminArticleResponse(article);
  }

  /** Unpublish an article: revert to DRAFT and clear publishedAt. */
  async unpublish(id: string): Promise<AdminArticleResponseDto> {
    await this.ensureExists(id);
    const article = await this.prisma.article.update({
      where: { id },
      data: { status: ArticleStatus.DRAFT, publishedAt: null },
      include: { category: true },
    });
    return toAdminArticleResponse(article);
  }

  // --- Admin: categories -----------------------------------------------------------

  /** All article categories (admin), ordered by name. */
  async listCategoriesForAdmin(): Promise<ArticleCategoryWithCountDto[]> {
    const categories = await this.prisma.articleCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { articles: true } } },
    });
    return categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      count: c._count.articles,
    }));
  }

  /** Create an article category; slug derived from name when omitted. P2002 -> 409. */
  async createCategory(dto: CreateArticleCategoryDto): Promise<ArticleCategoryWithCountDto> {
    const slug = await this.resolveUniqueCategorySlug(dto.slug ?? dto.name);
    const category = await this.prisma.articleCategory.create({
      data: { name: dto.name, slug },
    });
    return { id: category.id, slug: category.slug, name: category.name, count: 0 };
  }

  // --- Helpers ---------------------------------------------------------------------

  /** Published + already-live filter shared across every public read. */
  private publishedFilter(): Prisma.ArticleWhereInput {
    return { status: ArticleStatus.PUBLISHED, publishedAt: { lte: new Date() } };
  }

  private buildPublishedWhere(query: ArticleQueryDto): Prisma.ArticleWhereInput {
    const where: Prisma.ArticleWhereInput = { ...this.publishedFilter() };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category) {
      where.category = { slug: query.category };
    }
    return where;
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.article.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Article not found');
    }
  }

  /**
   * Turn arbitrary text into a URL slug: lowercase, non-alphanumerics collapsed to single
   * hyphens, leading/trailing hyphens stripped. Falls back to "article" if nothing remains.
   */
  private slugify(input: string): string {
    const slug = input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug.length > 0 ? slug : 'article';
  }

  /**
   * Decide the slug for a create/update:
   *  - An EXPLICIT slug from the admin is used verbatim (after slugify); a collision is a 409 —
   *    we never silently rewrite an admin-chosen URL (honours the documented contract).
   *  - An OMITTED slug is derived from the fallback (the title) and auto-suffixed to stay unique.
   * `excludeId` lets an update keep its own slug without colliding with itself.
   */
  private async resolveSlugForWrite(
    explicit: string | undefined,
    fallbackBase: string | undefined,
    excludeId?: string,
  ): Promise<string> {
    if (explicit !== undefined && explicit.trim() !== '') {
      const slug = this.slugify(explicit);
      if (await this.slugTaken(slug, excludeId)) {
        throw new ConflictException('An article with this slug already exists');
      }
      return slug;
    }
    return this.resolveUniqueSlug(fallbackBase ?? 'article', excludeId);
  }

  /**
   * Resolve a unique article slug from a base string, appending -2, -3, … on collision.
   * `excludeId` lets an update keep its own slug without colliding with itself.
   */
  private async resolveUniqueSlug(base: string, excludeId?: string): Promise<string> {
    const root = this.slugify(base);
    let candidate = root;
    let suffix = 2;
    // Bounded probe loop; race-loser writes still fall through to P2002 -> 409 at the filter.
    while (await this.slugTaken(candidate, excludeId)) {
      candidate = `${root}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private async slugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });
    return existing !== null && existing.id !== excludeId;
  }

  private async resolveUniqueCategorySlug(base: string): Promise<string> {
    const root = this.slugify(base);
    let candidate = root;
    let suffix = 2;
    while (
      (await this.prisma.articleCategory.findUnique({
        where: { slug: candidate },
        select: { id: true },
      })) !== null
    ) {
      candidate = `${root}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}
