import { Injectable } from '@nestjs/common';
import { OrderStatus, Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toProductResponse } from '../products/dto/product-response.dto';
import {
  RecommendationStrategy,
  RecommendationsResponseDto,
} from './dto/recommendations-response.dto';

const DEFAULT_LIMIT = 8;

/**
 * Deterministic, explainable recommendations. The whole strategy is a short priority ladder —
 * no ML, no randomness, no opaque scoring — so its behaviour is obvious and unit-testable.
 *
 *   1. Popular products in categories the customer has PURCHASED (excluding what they own).
 *   2. (No purchase history) Popular products in categories currently in their CART.
 *   3. (Neither) Global TOP SELLERS, topped up with the newest products.
 *
 * Inactive (soft-deleted) products are never returned. "Popularity" everywhere means total
 * units sold across non-cancelled orders, with stable tie-breaks (newest, then id).
 */
@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Personalized list for the home page / post-checkout. `userId` is undefined for guests. */
  async getForUser(userId: string | undefined, limit = DEFAULT_LIMIT): Promise<RecommendationsResponseDto> {
    if (userId) {
      // --- Priority 1: purchase history -------------------------------------------------
      const purchased = await this.prisma.orderItem.findMany({
        where: { order: { userId, status: { not: OrderStatus.CANCELLED } } },
        select: { productId: true, productCategory: true },
      });
      if (purchased.length > 0) {
        const ownedIds = unique(purchased.map((p) => p.productId));
        const categories = unique(purchased.map((p) => p.productCategory));
        const items = await this.popularInCategories(categories, ownedIds, limit);
        if (items.length > 0) {
          return { strategy: RecommendationStrategy.PURCHASE_HISTORY, items };
        }
        // Owns everything in those categories → fall through to top sellers.
      } else {
        // --- Priority 2: current cart ---------------------------------------------------
        const cart = await this.prisma.cart.findUnique({
          where: { userId },
          include: { items: { include: { product: true } } },
        });
        const cartItems = cart?.items ?? [];
        const cartCategories = unique(
          cartItems.filter((i) => i.product.isActive).map((i) => i.product.category),
        );
        if (cartCategories.length > 0) {
          const cartProductIds = cartItems.map((i) => i.productId);
          const items = await this.popularInCategories(cartCategories, cartProductIds, limit);
          if (items.length > 0) {
            return { strategy: RecommendationStrategy.CART, items };
          }
        }
      }
    }

    // --- Priority 3: top sellers (also the guest path) ------------------------------------
    const items = await this.topSellers(limit, []);
    return {
      strategy: items.length > 0 ? RecommendationStrategy.TOP_SELLERS : RecommendationStrategy.NONE,
      items,
    };
  }

  /** "You might also like" for a product detail page: other active products in its category. */
  async getRelated(productId: string, limit = DEFAULT_LIMIT): Promise<RecommendationsResponseDto> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (product) {
      const candidates = await this.prisma.product.findMany({
        where: { isActive: true, category: product.category, id: { not: productId } },
      });
      const items = await this.rankByPopularity(candidates, limit);
      if (items.length > 0) {
        return { strategy: RecommendationStrategy.RELATED_CATEGORY, items };
      }
    }
    // Unknown product, or a lonely category → fall back to top sellers (minus this product).
    const items = await this.topSellers(limit, productId ? [productId] : []);
    return {
      strategy: items.length > 0 ? RecommendationStrategy.TOP_SELLERS : RecommendationStrategy.NONE,
      items,
    };
  }

  /** Active products in the given categories, excluding `excludeIds`, ranked by popularity. */
  private async popularInCategories(categories: string[], excludeIds: string[], limit: number) {
    const candidates = await this.prisma.product.findMany({
      where: { isActive: true, category: { in: categories }, id: { notIn: excludeIds } },
    });
    return this.rankByPopularity(candidates, limit);
  }

  /**
   * Global best sellers by units (non-cancelled orders), filtered to active products and
   * `excludeIds`. If that yields fewer than `limit`, top up with the newest active products
   * so the list is never sparse on a low-traffic catalog.
   */
  private async topSellers(limit: number, excludeIds: string[]) {
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { status: { not: OrderStatus.CANCELLED } },
        ...(excludeIds.length ? { productId: { notIn: excludeIds } } : {}),
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit * 3, // over-fetch: some best sellers may be inactive
    });

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) }, isActive: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const ranked: Product[] = [];
    for (const g of grouped) {
      const product = byId.get(g.productId);
      if (product) ranked.push(product);
    }

    if (ranked.length < limit) {
      const have = new Set([...ranked.map((p) => p.id), ...excludeIds]);
      const fillers = await this.prisma.product.findMany({
        where: { isActive: true, id: { notIn: [...have] } },
        orderBy: { createdAt: 'desc' },
        take: limit - ranked.length,
      });
      ranked.push(...fillers);
    }

    return ranked.slice(0, limit).map(toProductResponse);
  }

  /**
   * Order products by units sold (non-cancelled), then newest, then id — fully deterministic.
   * Popularity is fetched in one grouped query for the candidate set.
   */
  private async rankByPopularity(products: Product[], limit: number) {
    if (products.length === 0) return [];
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: products.map((p) => p.id) },
        order: { status: { not: OrderStatus.CANCELLED } },
      },
      _sum: { quantity: true },
    });
    const sold = new Map(grouped.map((g) => [g.productId, g._sum.quantity ?? 0]));

    return [...products]
      .sort((a, b) => {
        const byUnits = (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0);
        if (byUnits !== 0) return byUnits;
        const byNewest = b.createdAt.getTime() - a.createdAt.getTime();
        if (byNewest !== 0) return byNewest;
        return a.id.localeCompare(b.id);
      })
      .slice(0, limit)
      .map(toProductResponse);
  }
}

const unique = <T>(values: T[]): T[] => [...new Set(values)];
