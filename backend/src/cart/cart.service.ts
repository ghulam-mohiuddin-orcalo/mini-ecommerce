import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product, ProductVariant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { buildCartResponse, CartResponseDto, CartWithItems } from './dto/cart-response.dto';

const CART_INCLUDE = {
  items: { include: { product: true, variant: true }, orderBy: { createdAt: 'asc' } },
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
   * Add units, merging into the existing line for that product/variant (no duplicate lines).
   * Validates the product is active and that the resulting quantity fits in stock. When a
   * variant is chosen, the variant is validated and its stock is the authority; with no variant
   * the behaviour is unchanged — stock comes straight off the product.
   */
  async addItem(userId: string, dto: AddCartItemDto): Promise<CartResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const product = await this.requireActiveProduct(tx, dto.productId);
      const variant = await this.resolveVariant(tx, product, dto.variantId);
      const variantId = variant?.id ?? null;
      const cart = await tx.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      // findFirst (not findUnique) so the variant-less line can be matched on variantId: null —
      // Prisma's compound-unique input can't address a null member.
      const existing = await tx.cartItem.findFirst({
        where: { cartId: cart.id, productId: product.id, variantId },
      });
      const newQuantity = (existing?.quantity ?? 0) + dto.quantity;
      this.assertStock(product, variant, newQuantity);

      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: newQuantity },
        });
      } else {
        await tx.cartItem.create({
          data: { cartId: cart.id, productId: product.id, variantId, quantity: dto.quantity },
        });
      }
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
      const variant = await this.resolveVariant(tx, product, dto.variantId);
      const variantId = variant?.id ?? null;
      const cart = await tx.cart.findUnique({ where: { userId } });
      // findFirst so a variant-less line (variantId: null) is addressable — see addItem.
      const existing = cart
        ? await tx.cartItem.findFirst({
            where: { cartId: cart.id, productId, variantId },
          })
        : null;
      if (!cart || !existing) {
        throw new NotFoundException('Item not in cart');
      }
      this.assertStock(product, variant, dto.quantity);

      await tx.cartItem.update({
        where: { id: existing.id },
        data: { quantity: dto.quantity },
      });
      return buildCartResponse(await this.loadCart(tx, userId));
    });
  }

  /**
   * Remove a line (idempotent — removing an absent line is a no-op). A product can now appear as
   * multiple lines (one per variant), so the optional variantId pins which line to remove.
   */
  async removeItem(
    userId: string,
    productId: string,
    variantId?: string,
  ): Promise<CartResponseDto> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId, variantId: variantId ?? null },
      });
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

  /**
   * Resolve an optional variant for a product. Returns null when no variant was requested
   * (variant-less product — today's behaviour). Otherwise the variant must exist, be active and
   * belong to this product, or it's a 404.
   */
  private async resolveVariant(
    client: Prisma.TransactionClient,
    product: Product,
    variantId?: string,
  ): Promise<ProductVariant | null> {
    if (variantId === undefined) {
      return null;
    }
    const variant = await client.productVariant.findFirst({
      where: { id: variantId, productId: product.id, isActive: true },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }
    return variant;
  }

  /** Assert the requested quantity fits in stock — the variant's stock when one is chosen. */
  private assertStock(
    product: Product,
    variant: ProductVariant | null,
    quantity: number,
  ): void {
    const stock = variant ? variant.stock : product.stock;
    if (quantity > stock) {
      const label = variant ? `"${product.name}" (${variant.label})` : `"${product.name}"`;
      throw new ConflictException(`Only ${stock} unit(s) of ${label} are in stock`);
    }
  }
}
