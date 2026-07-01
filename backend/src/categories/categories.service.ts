import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminCategoryQueryDto,
  CategorySort,
  CategoryStatusFilter,
} from './dto/admin-category-query.dto';
import {
  CategoryResponseDto,
  PaginatedAdminCategoriesDto,
  toCategoryResponse,
} from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Public reads (ACTIVE only) --------------------------------------------------

  /**
   * Storefront categories: active only, ordered by sortOrder then name. `productCount` counts
   * ACTIVE products only (a hidden product must not inflate the storefront count) — the relation
   * `_count` is scoped with a `where` so it stays a single round trip.
   */
  async findAllActive(): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });
    return categories.map((c) => toCategoryResponse(c, c._count.products));
  }

  /** A single active category by slug, or 404. Active-product count only. */
  async findBySlug(slug: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findFirst({
      where: { slug, isActive: true },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return toCategoryResponse(category, category._count.products);
  }

  // --- Admin ------------------------------------------------------------------------

  /**
   * All categories (any status), paginated, with search + status filter + sort. `productCount`
   * here is the TOTAL number of products (active or not), since admins manage the full catalog.
   */
  async findAllForAdmin(query: AdminCategoryQueryDto): Promise<PaginatedAdminCategoriesDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.CategoryWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status === CategoryStatusFilter.ACTIVE) where.isActive = true;
    if (query.status === CategoryStatusFilter.INACTIVE) where.isActive = false;

    const orderBy = this.buildOrderBy(query.sort);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: items.map((c) => toCategoryResponse(c, c._count.products)),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /** A single category (any status) by id, or 404. Total-product count. */
  async findOneForAdmin(id: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return toCategoryResponse(category, category._count.products);
  }

  /**
   * Create a category. The slug is taken from the payload or derived from the name and made
   * unique. Name uniqueness is checked explicitly for a clear message; the `name`/`slug` unique
   * constraints (P2002 -> 409) are the race-safe backstop.
   */
  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    await this.assertNameFree(dto.name);
    const slug = await this.resolveSlugForWrite(dto.slug, dto.name);

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    return toCategoryResponse(category, 0);
  }

  /**
   * Edit a category. Provided fields are patched. The slug is only re-derived when an explicit
   * slug is supplied (never silently on a rename — that would break existing URLs). Name/slug
   * uniqueness is enforced excluding the row itself.
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    await this.ensureExists(id);

    const data: Prisma.CategoryUpdateInput = {};
    if (dto.name !== undefined) {
      await this.assertNameFree(dto.name, id);
      data.name = dto.name;
    }
    if (dto.slug !== undefined) {
      data.slug = await this.resolveSlugForWrite(dto.slug, dto.name, id);
    }
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const category = await this.prisma.category.update({
      where: { id },
      data,
      include: { _count: { select: { products: true } } },
    });
    return toCategoryResponse(category, category._count.products);
  }

  /** Show/hide a category in the storefront without deleting it. */
  async setActive(id: string, isActive: boolean): Promise<CategoryResponseDto> {
    await this.ensureExists(id);
    const category = await this.prisma.category.update({
      where: { id },
      data: { isActive },
      include: { _count: { select: { products: true } } },
    });
    return toCategoryResponse(category, category._count.products);
  }

  /**
   * Hard-delete a category. Blocked (409) while ANY product references it — reassign or remove
   * those products first, or deactivate the category instead. The `Product.categoryId` FK
   * (onDelete: Restrict) is the DB backstop for this app-level guard.
   */
  async remove(id: string): Promise<{ id: string }> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (category._count.products > 0) {
      throw new ConflictException(
        'Cannot delete a category that still has products assigned. Reassign or remove those products first, or deactivate the category instead.',
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { id };
  }

  // --- Helpers ---------------------------------------------------------------------

  private buildOrderBy(
    sort: CategorySort = CategorySort.SORT_ORDER_ASC,
  ): Prisma.CategoryOrderByWithRelationInput | Prisma.CategoryOrderByWithRelationInput[] {
    switch (sort) {
      case CategorySort.NAME_ASC:
        return { name: 'asc' };
      case CategorySort.NAME_DESC:
        return { name: 'desc' };
      case CategorySort.CREATED_DESC:
        return { createdAt: 'desc' };
      case CategorySort.CREATED_ASC:
        return { createdAt: 'asc' };
      case CategorySort.PRODUCTS_DESC:
        // Order by the number of assigned products (admins triaging the catalog).
        return { products: { _count: 'desc' } };
      case CategorySort.SORT_ORDER_ASC:
      default:
        return [{ sortOrder: 'asc' }, { name: 'asc' }];
    }
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.category.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Category not found');
    }
  }

  /** Reject a duplicate name up front with a clear message (unique index is the backstop). */
  private async assertNameFree(name: string, excludeId?: string): Promise<void> {
    const existing = await this.prisma.category.findUnique({
      where: { name },
      select: { id: true },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('A category with this name already exists');
    }
  }

  /**
   * Turn arbitrary text into a URL slug: lowercase, non-alphanumerics collapsed to single
   * hyphens, leading/trailing hyphens stripped. Falls back to "category" if nothing remains.
   */
  private slugify(input: string): string {
    const slug = input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug.length > 0 ? slug : 'category';
  }

  /**
   * Decide the slug for a create/update:
   *  - An EXPLICIT slug is used verbatim (after slugify); a collision is a 409 — we never
   *    silently rewrite an admin-chosen URL.
   *  - An OMITTED slug is derived from the fallback (the name) and auto-suffixed to stay unique.
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
        throw new ConflictException('A category with this slug already exists');
      }
      return slug;
    }
    return this.resolveUniqueSlug(fallbackBase ?? 'category', excludeId);
  }

  /** Resolve a unique slug from a base string, appending -2, -3, … on collision. */
  private async resolveUniqueSlug(base: string, excludeId?: string): Promise<string> {
    const root = this.slugify(base);
    let candidate = root;
    let suffix = 2;
    // Bounded probe loop; a race-loser still falls through to P2002 -> 409 at the filter.
    while (await this.slugTaken(candidate, excludeId)) {
      candidate = `${root}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private async slugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });
    return existing !== null && existing.id !== excludeId;
  }
}
