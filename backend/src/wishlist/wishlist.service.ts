import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  WishlistResponseDto,
  WishlistToggleResponseDto,
  buildWishlistResponse,
} from './dto/wishlist-response.dto';

/**
 * The authenticated user's wishlist: a set of products they want to keep an eye on. Every method
 * is scoped to `userId`, so there is no way to read or mutate another user's list (no IDOR). The
 * `@@unique([userId, productId])` constraint guarantees a product appears at most once per user;
 * adds are therefore idempotent and never raise on a duplicate.
 */
@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  /** The user's wishlist, joined with each product, newest entry first. */
  async getWishlist(userId: string): Promise<WishlistResponseDto> {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    return buildWishlistResponse(items);
  }

  /**
   * Add a product to the wishlist. Validates the product exists and is active (404 otherwise).
   * Idempotent: `createMany` with `skipDuplicates` makes a second add a no-op rather than a 409,
   * relying on the unique constraint instead of a race-prone pre-check. Returns the fresh list.
   */
  async addItem(userId: string, productId: string): Promise<WishlistResponseDto> {
    await this.assertActiveProduct(productId);
    await this.prisma.wishlistItem.createMany({
      data: [{ userId, productId }],
      skipDuplicates: true,
    });
    return this.getWishlist(userId);
  }

  /**
   * Remove a product from the wishlist. Idempotent: `deleteMany` removes the (at most one) owned
   * row and silently does nothing when it is absent. Scoped by `userId` so it can only ever touch
   * the caller's own entry. Returns the fresh list.
   */
  async removeItem(userId: string, productId: string): Promise<WishlistResponseDto> {
    await this.prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    return this.getWishlist(userId);
  }

  /**
   * Toggle a product on the wishlist: remove it if present, add it (after validating the product
   * is active) if absent. Returns the resulting membership so a single button can flip state.
   */
  async toggle(userId: string, productId: string): Promise<WishlistToggleResponseDto> {
    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      await this.prisma.wishlistItem.delete({ where: { id: existing.id } });
      return { wishlisted: false };
    }
    await this.assertActiveProduct(productId);
    // skipDuplicates guards the rare concurrent-add race; the membership is still "wishlisted".
    await this.prisma.wishlistItem.createMany({
      data: [{ userId, productId }],
      skipDuplicates: true,
    });
    return { wishlisted: true };
  }

  /** Reject (404) products that don't exist or are soft-deleted — inactive items aren't sellable. */
  private async assertActiveProduct(productId: string): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }
}
