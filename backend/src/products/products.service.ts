import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductQueryDto, ProductSort } from './dto/product-query.dto';
import {
  PaginatedProductsDto,
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
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: items.map(toAdminProductResponse),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async createProduct(dto: CreateProductDto): Promise<AdminProductResponseDto> {
    // A duplicate SKU surfaces as Prisma P2002 -> 409 via the global exception filter.
    const product = await this.prisma.product.create({ data: dto });
    return toAdminProductResponse(product);
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<AdminProductResponseDto> {
    await this.ensureExists(id);
    const product = await this.prisma.product.update({ where: { id }, data: dto });
    return toAdminProductResponse(product);
  }

  /** Soft delete / reactivate. */
  async setActive(id: string, isActive: boolean): Promise<AdminProductResponseDto> {
    await this.ensureExists(id);
    const product = await this.prisma.product.update({ where: { id }, data: { isActive } });
    return toAdminProductResponse(product);
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Product not found');
    }
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
