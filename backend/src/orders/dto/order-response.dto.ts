import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, Prisma } from '@prisma/client';

export class OrderItemResponseDto {
  @ApiProperty() productId!: string;
  @ApiProperty({ description: 'Snapshot of the product name at order time' })
  productName!: string;
  @ApiProperty() productImageUrl!: string;
  @ApiProperty({ description: 'Snapshot of the unit price at order time, in cents' })
  unitPriceCents!: number;
  @ApiProperty() quantity!: number;
  @ApiProperty({ description: 'unitPriceCents * quantity' }) lineTotalCents!: number;
}

export class OrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty({ description: 'Authoritative charged total, in cents' }) totalCents!: number;
  @ApiProperty({ nullable: true }) paymentRef!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) paidAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: OrderItemResponseDto, isArray: true }) items!: OrderItemResponseDto[];
}

export type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

export function toOrderResponse(order: OrderWithItems): OrderResponseDto {
  return {
    id: order.id,
    status: order.status,
    totalCents: order.totalCents,
    paymentRef: order.paymentRef,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    items: order.items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      productImageUrl: it.productImageUrl,
      unitPriceCents: it.unitPriceCents,
      quantity: it.quantity,
      lineTotalCents: it.unitPriceCents * it.quantity,
    })),
  };
}
