import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductQueryDto, ProductSort } from './dto/product-query.dto';
import {
  PaginatedProductsDto,
  ProductEnrichment,
  ProductResponseDto,
  toProductResponse,
} from './dto/product-response.dto';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import {
  AdminProductResponseDto,
  PaginatedAdminProductsDto,
  toAdminProductResponse,
} from './dto/admin-product-response.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Customer-facing listing. Only active products are ever returned. Search/filter/sort are
   * composed from the validated query, and data + total count run in a single round trip.
   * Each row is then enriched (gallery, active variants, rating aggregate, derived badges)
   * with a handful of batched queries over the page's product ids — never N+1 per row.
   */
  async findMany(query: ProductQueryDto): Promise<PaginatedProductsDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query.sort);

    // Rating is an aggregate over reviews, not a column, so it can't live in `buildWhere`.
    // Resolve the set of product ids whose average rating meets the threshold, then constrain
    // the listing by id. This keeps pagination/total correct across the whole catalog (the old
    // client-side filter only narrowed the current page, hiding matches on other pages).
    if (query.minRating !== undefined) {
      const matches = await this.prisma.review.groupBy({
        by: ['productId'],
        _avg: { rating: true },
        having: { rating: { _avg: { gte: query.minRating } } },
      });
      const matchingIds = matches.map((m) => m.productId);
      if (matchingIds.length === 0) {
        return { data: [], meta: { page, pageSize, total: 0, totalPages: 0 } };
      }
      where.id = { in: matchingIds };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    const enrichmentById = await this.buildEnrichment(items.map((p) => p.id));

    return {
      data: items.map((p) => toProductResponse(p, enrichmentById.get(p.id))),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /** Single active product, or 404. Inactive (soft-deleted) products are never exposed. */
  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findFirst({ where: { id, isActive: true } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const enrichmentById = await this.buildEnrichment([product.id]);
    return toProductResponse(product, enrichmentById.get(product.id));
  }

  /** Distinct categories among active products (for the catalog filter). */
  async listCategories(): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      where: { isActive: true },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  }

  /**
   * Public best sellers: real paid demand only, no badge/manual fallback.
   * Ranking is explainable and stable:
   * units sold in the rolling window → revenue → rating average → rating count → newest.
   */
  async findBestSellers(limit = 4, windowDays = 90): Promise<ProductResponseDto[]> {
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: { not: OrderStatus.CANCELLED },
          paidAt: { not: null },
          createdAt: { gte: since },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit * 4,
    });

    if (grouped.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: grouped.map((g) => g.productId) },
        isActive: true,
        OR: [{ stock: { gt: 0 } }, { variants: { some: { isActive: true, stock: { gt: 0 } } } }],
      },
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    const candidateIds = products.map((p) => p.id);
    const enrichmentById = await this.buildEnrichment(candidateIds);
    const unitsById = new Map(grouped.map((g) => [g.productId, g._sum.quantity ?? 0]));
    const revenueById = new Map<string, number>();

    const revenueRows = await this.prisma.orderItem.findMany({
      where: {
        productId: { in: candidateIds },
        order: {
          status: { not: OrderStatus.CANCELLED },
          paidAt: { not: null },
          createdAt: { gte: since },
        },
      },
      select: { productId: true, unitPriceCents: true, quantity: true },
    });

    for (const row of revenueRows) {
      revenueById.set(
        row.productId,
        (revenueById.get(row.productId) ?? 0) + row.unitPriceCents * row.quantity,
      );
    }

    return products
      .sort((a, b) => {
        const byUnits = (unitsById.get(b.id) ?? 0) - (unitsById.get(a.id) ?? 0);
        if (byUnits !== 0) return byUnits;

        const byRevenue = (revenueById.get(b.id) ?? 0) - (revenueById.get(a.id) ?? 0);
        if (byRevenue !== 0) return byRevenue;

        const aRating = enrichmentById.get(a.id)?.ratingAvg ?? 0;
        const bRating = enrichmentById.get(b.id)?.ratingAvg ?? 0;
        if (bRating !== aRating) return bRating - aRating;

        const aRatingCount = enrichmentById.get(a.id)?.ratingCount ?? 0;
        const bRatingCount = enrichmentById.get(b.id)?.ratingCount ?? 0;
        if (bRatingCount !== aRatingCount) return bRatingCount - aRatingCount;

        return b.createdAt.getTime() - a.createdAt.getTime();
      })
      .slice(0, limit)
      .map((p) => toProductResponse(p, enrichmentById.get(p.id)));
  }

  /**
   * Batch-load every enrichment input for a page of products in a fixed number of queries
   * (images, active variants, rating aggregate, units sold) keyed by product id. This keeps
   * the public listing O(1) round trips regardless of page size.
   */
  private async buildEnrichment(productIds: string[]): Promise<Map<string, ProductEnrichment>> {
    const enrichment = new Map<string, ProductEnrichment>();
    if (productIds.length === 0) return enrichment;
    for (const id of productIds) enrichment.set(id, {});

    const [images, variants, ratings, sales] = await Promise.all([
      this.prisma.productImage.findMany({
        where: { productId: { in: productIds } },
        orderBy: { position: 'asc' },
        select: { productId: true, url: true, alt: true },
      }),
      this.prisma.productVariant.findMany({
        where: { productId: { in: productIds }, isActive: true },
        orderBy: { position: 'asc' },
        select: {
          productId: true,
          id: true,
          label: true,
          color: true,
          size: true,
          priceCents: true,
          stock: true,
          sku: true,
        },
      }),
      this.prisma.review.groupBy({
        by: ['productId'],
        where: { productId: { in: productIds } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      // One groupBy over OrderItem for the whole page — same "units sold across non-cancelled
      // orders" signal the recommendations service uses, here feeding the BESTSELLER/TRENDING badges.
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          productId: { in: productIds },
          order: { status: { not: OrderStatus.CANCELLED } },
        },
        _sum: { quantity: true },
      }),
    ]);

    for (const image of images) {
      const e = enrichment.get(image.productId);
      if (!e) continue;
      (e.images ??= []).push({ url: image.url, alt: image.alt });
    }
    for (const variant of variants) {
      const e = enrichment.get(variant.productId);
      if (!e) continue;
      (e.variants ??= []).push({
        id: variant.id,
        label: variant.label,
        color: variant.color,
        size: variant.size,
        priceCents: variant.priceCents,
        stock: variant.stock,
        sku: variant.sku,
      });
    }
    for (const row of ratings) {
      const e = enrichment.get(row.productId);
      if (!e) continue;
      e.ratingAvg = Math.round((row._avg.rating ?? 0) * 10) / 10; // one decimal place
      e.ratingCount = row._count.rating;
    }
    for (const row of sales) {
      const e = enrichment.get(row.productId);
      if (!e) continue;
      e.unitsSold = row._sum.quantity ?? 0;
    }

    return enrichment;
  }

  // --- Admin -----------------------------------------------------------------------

  /** All products including inactive (admins manage the full catalog), paginated. */
  async findAllForAdmin(query: AdminProductQueryDto): Promise<PaginatedAdminProductsDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ProductWhereInput = query.search
      ? { name: { contains: query.search, mode: 'insensitive' } }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          images: { orderBy: { position: 'asc' } },
          variants: { orderBy: { position: 'asc' } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: items.map(toAdminProductResponse),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * Create a product plus its (optional) gallery images and variants in one transaction.
   * A duplicate product or variant SKU surfaces as Prisma P2002 -> 409 via the global filter.
   */
  async createProduct(dto: CreateProductDto): Promise<AdminProductResponseDto> {
    const { images, variants, ...productData } = dto;
    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data: productData });
      if (images && images.length > 0) {
        await tx.productImage.createMany({
          data: images.map((image, index) => ({
            productId: created.id,
            url: image.url,
            alt: image.alt ?? null,
            position: image.position ?? index,
          })),
        });
      }
      if (variants && variants.length > 0) {
        await tx.productVariant.createMany({
          data: variants.map((variant, index) => ({
            productId: created.id,
            label: variant.label,
            color: variant.color ?? null,
            size: variant.size ?? null,
            priceCents: variant.priceCents,
            stock: variant.stock,
            sku: variant.sku,
            position: variant.position ?? index,
            isActive: variant.isActive ?? true,
          })),
        });
      }
      return this.loadAdminProduct(tx, created.id);
    });
    return toAdminProductResponse(product);
  }

  /**
   * Edit a product. Scalar fields are patched; if `images`/`variants` are present they are
   * treated as the full desired set and synced via replace-set (delete-then-recreate) — the
   * simplest approach that keeps the persisted gallery/variants exactly equal to the payload.
   * Omitting an array leaves the existing rows untouched. Variants that already appear in an
   * order are protected by the OrderItem.variant Restrict FK, so a destructive replace of an
   * ordered variant fails loudly (P2003) rather than corrupting history.
   */
  async updateProduct(id: string, dto: UpdateProductDto): Promise<AdminProductResponseDto> {
    await this.ensureExists(id);
    const { images, variants, ...productData } = dto;

    const product = await this.prisma.$transaction(async (tx) => {
      if (Object.keys(productData).length > 0) {
        await tx.product.update({ where: { id }, data: productData });
      }
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (images.length > 0) {
          await tx.productImage.createMany({
            data: images.map((image, index) => ({
              productId: id,
              url: image.url,
              alt: image.alt ?? null,
              position: image.position ?? index,
            })),
          });
        }
      }
      if (variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        if (variants.length > 0) {
          await tx.productVariant.createMany({
            data: variants.map((variant, index) => ({
              productId: id,
              label: variant.label,
              color: variant.color ?? null,
              size: variant.size ?? null,
              priceCents: variant.priceCents,
              stock: variant.stock,
              sku: variant.sku,
              position: variant.position ?? index,
              isActive: variant.isActive ?? true,
            })),
          });
        }
      }
      return this.loadAdminProduct(tx, id);
    });

    return toAdminProductResponse(product);
  }

  /** Soft delete / reactivate. */
  async setActive(id: string, isActive: boolean): Promise<AdminProductResponseDto> {
    await this.ensureExists(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: { isActive },
      include: { images: { orderBy: { position: 'asc' } }, variants: { orderBy: { position: 'asc' } } },
    });
    return toAdminProductResponse(product);
  }

  /** Load a product with its gallery + all variants (admins see inactive variants too). */
  private loadAdminProduct(tx: Prisma.TransactionClient, id: string) {
    return tx.product.findUniqueOrThrow({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: { position: 'asc' } },
      },
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Product not found');
    }
  }

  /** Reusable WHERE builder — active-only, plus optional search / category / price range. */
  private buildWhere(query: ProductQueryDto): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = { isActive: true };

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.priceCents = {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      };
    }
    return where;
  }

  private buildOrderBy(sort: ProductSort = ProductSort.NEWEST): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case ProductSort.PRICE_ASC:
        return { priceCents: 'asc' };
      case ProductSort.PRICE_DESC:
        return { priceCents: 'desc' };
      case ProductSort.NEWEST:
      default:
        return { createdAt: 'desc' };
    }
  }
}
