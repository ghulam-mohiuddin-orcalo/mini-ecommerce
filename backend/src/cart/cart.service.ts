import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { buildCartResponse, CartResponseDto, CartWithItems } from './dto/cart-response.dto';

const CART_INCLUDE = {
  items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.CartInclude;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /** The authenticated user's cart with computed totals (empty if none yet). */
  async getCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.loadCart(this.prisma, userId);
    return buildCartResponse(cart);
  }

  /**
   * Add units, merging into the existing line for that product (no duplicate lines).
   * Validates the product is active and that the resulting quantity fits in stock.
   */
  async addItem(userId: string, dto: AddCartItemDto): Promise<CartResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const product = await this.requireActiveProduct(tx, dto.productId);
      const cart = await tx.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      const existing = await tx.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId: product.id } },
      });
      const newQuantity = (existing?.quantity ?? 0) + dto.quantity;
      this.assertStock(product, newQuantity);

      await tx.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId: product.id } },
        create: { cartId: cart.id, productId: product.id, quantity: dto.quantity },
        update: { quantity: newQuantity },
      });
      return buildCartResponse(await this.loadCart(tx, userId));
    });
  }

  /** Set the absolute quantity for a line. 404 if the line isn't in the cart. */
  async updateItem(
    userId: string,
    productId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const product = await this.requireActiveProduct(tx, productId);
      const cart = await tx.cart.findUnique({ where: { userId } });
      const existing = cart
        ? await tx.cartItem.findUnique({
            where: { cartId_productId: { cartId: cart.id, productId } },
          })
        : null;
      if (!cart || !existing) {
        throw new NotFoundException('Item not in cart');
      }
      this.assertStock(product, dto.quantity);

      await tx.cartItem.update({
        where: { cartId_productId: { cartId: cart.id, productId } },
        data: { quantity: dto.quantity },
      });
      return buildCartResponse(await this.loadCart(tx, userId));
    });
  }

  /** Remove a line (idempotent — removing an absent line is a no-op). */
  async removeItem(userId: string, productId: string): Promise<CartResponseDto> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    }
    return this.getCart(userId);
  }

  /** Empty the cart. */
  async clear(userId: string): Promise<CartResponseDto> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return this.getCart(userId);
  }

  // --- helpers ---------------------------------------------------------------------

  private loadCart(client: Prisma.TransactionClient, userId: string): Promise<CartWithItems | null> {
    return client.cart.findUnique({ where: { userId }, include: CART_INCLUDE });
  }

  /** Active product or 404. Kept inline (a one-line predicate) so cart stays self-contained. */
  private async requireActiveProduct(
    client: Prisma.TransactionClient,
    productId: string,
  ): Promise<Product> {
    const product = await client.product.findFirst({ where: { id: productId, isActive: true } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private assertStock(product: Product, quantity: number): void {
    if (quantity > product.stock) {
      throw new ConflictException(
        `Only ${product.stock} unit(s) of "${product.name}" are in stock`,
      );
    }
  }
}
