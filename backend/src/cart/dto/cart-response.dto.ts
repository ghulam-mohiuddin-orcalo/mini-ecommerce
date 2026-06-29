import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class CartLineDto {
  @ApiProperty() productId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() imageUrl!: string;
  @ApiProperty() category!: string;
  @ApiProperty({ description: 'Current unit price in cents' }) unitPriceCents!: number;
  @ApiProperty() quantity!: number;
  @ApiProperty({ description: 'unitPriceCents * quantity' }) lineTotalCents!: number;
  @ApiProperty({ description: 'Units currently in stock' }) stock!: number;
  @ApiProperty({ description: 'Product active and enough stock for this quantity' })
  available!: boolean;
}

export class CartResponseDto {
  @ApiProperty({ nullable: true }) id!: string | null;
  @ApiProperty({ type: CartLineDto, isArray: true }) items!: CartLineDto[];
  @ApiProperty({ description: 'Sum of line totals at current prices' }) totalCents!: number;
  @ApiProperty({ description: 'Total units across all lines' }) itemCount!: number;
}

/** Cart row joined with each line's product. */
export type CartWithItems = Prisma.CartGetPayload<{
  include: { items: { include: { product: true } } };
}>;

/**
 * Single source of truth for cart totals. Always computed from the CURRENT product price —
 * the stored cart never carries a price, so client-sent totals can't be trusted or used.
 */
export function buildCartResponse(cart: CartWithItems | null): CartResponseDto {
  if (!cart) {
    return { id: null, items: [], totalCents: 0, itemCount: 0 };
  }
  const items: CartLineDto[] = cart.items.map((item) => {
    const unitPriceCents = item.product.priceCents;
    return {
      productId: item.productId,
      name: item.product.name,
      imageUrl: item.product.imageUrl,
      category: item.product.category,
      unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: unitPriceCents * item.quantity,
      stock: item.product.stock,
      available: item.product.isActive && item.product.stock >= item.quantity,
    };
  });
  return {
    id: cart.id,
    items,
    totalCents: items.reduce((sum, i) => sum + i.lineTotalCents, 0),
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}
