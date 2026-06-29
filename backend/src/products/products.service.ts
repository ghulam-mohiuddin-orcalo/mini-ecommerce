import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductQueryDto, ProductSort } from './dto/product-query.dto';
import {
  PaginatedProductsDto,
  ProductResponseDto,
  toProductResponse,
} from './dto/product-response.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Customer-facing listing. Only active products are ever returned. Search/filter/sort are
   * composed from the validated query, and data + total count run in a single round trip.
   */
  async findMany(query: ProductQueryDto): Promise<PaginatedProductsDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(query.sort);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: items.map(toProductResponse),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /** Single active product, or 404. Inactive (soft-deleted) products are never exposed. */
  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findFirst({ where: { id, isActive: true } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return toProductResponse(product);
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
