import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class CartLineDto {
  @ApiProperty() productId!: string;
  @ApiProperty({ nullable: true, description: 'Chosen variant id, or null for variant-less lines' })
  variantId!: string | null;
  @ApiProperty({ nullable: true, description: 'Snapshot-friendly label of the chosen variant, if any' })
  variantLabel!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty() imageUrl!: string;
  @ApiProperty() category!: string;
  @ApiProperty({ description: 'Current unit price in cents (the variant price when one is chosen)' })
  unitPriceCents!: number;
  @ApiProperty() quantity!: number;
  @ApiProperty({ description: 'unitPriceCents * quantity' }) lineTotalCents!: number;
  @ApiProperty({ description: 'Units currently in stock (the variant stock when one is chosen)' })
  stock!: number;
  @ApiProperty({ description: 'Product/variant active and enough stock for this quantity' })
  available!: boolean;
}

export class CartResponseDto {
  @ApiProperty({ nullable: true }) id!: string | null;
  @ApiProperty({ type: CartLineDto, isArray: true }) items!: CartLineDto[];
  @ApiProperty({ description: 'Sum of line totals at current prices' }) totalCents!: number;
  @ApiProperty({ description: 'Total units across all lines' }) itemCount!: number;
}

/** Cart row joined with each line's product and (optional) variant. */
export type CartWithItems = Prisma.CartGetPayload<{
  include: { items: { include: { product: true; variant: true } } };
}>;

/**
 * Single source of truth for cart totals. Always computed from the CURRENT product (or variant)
 * price — the stored cart never carries a price, so client-sent totals can't be trusted or used.
 * When a line carries a variant, its price/stock/availability come from that variant row; a
 * variant-less line behaves exactly as before, reading straight off the product.
 */
export function buildCartResponse(cart: CartWithItems | null): CartResponseDto {
  if (!cart) {
    return { id: null, items: [], totalCents: 0, itemCount: 0 };
  }
  const items: CartLineDto[] = cart.items.map((item) => {
    const unitPriceCents = item.variant ? item.variant.priceCents : item.product.priceCents;
    const stock = item.variant ? item.variant.stock : item.product.stock;
    const variantActive = item.variant ? item.variant.isActive : true;
    return {
      productId: item.productId,
      variantId: item.variantId,
      variantLabel: item.variant ? item.variant.label : null,
      name: item.product.name,
      imageUrl: item.product.imageUrl,
      category: item.product.category,
      unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: unitPriceCents * item.quantity,
      stock,
      available: item.product.isActive && variantActive && stock >= item.quantity,
    };
  });
  return {
    id: cart.id,
    items,
    totalCents: items.reduce((sum, i) => sum + i.lineTotalCents, 0),
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}
