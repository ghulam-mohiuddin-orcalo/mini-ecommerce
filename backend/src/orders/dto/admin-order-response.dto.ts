import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, Prisma } from '@prisma/client';
import { OrderItemResponseDto } from './order-response.dto';

export class OrderCustomerDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
}

export class AdminOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty() totalCents!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: OrderCustomerDto }) customer!: OrderCustomerDto;
  @ApiProperty({ type: OrderItemResponseDto, isArray: true }) items!: OrderItemResponseDto[];
}

export class PaginationMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class PaginatedAdminOrdersDto {
  @ApiProperty({ type: AdminOrderResponseDto, isArray: true }) data!: AdminOrderResponseDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}

export type OrderWithItemsAndUser = Prisma.OrderGetPayload<{
  include: { items: true; user: true };
}>;

export function toAdminOrderResponse(order: OrderWithItemsAndUser): AdminOrderResponseDto {
  return {
    id: order.id,
    status: order.status,
    totalCents: order.totalCents,
    createdAt: order.createdAt,
    customer: { id: order.user.id, name: order.user.name, email: order.user.email },
    items: order.items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      productImageUrl: it.productImageUrl,
      variantId: it.variantId,
      variantLabel: it.variantLabel,
      unitPriceCents: it.unitPriceCents,
      quantity: it.quantity,
      lineTotalCents: it.unitPriceCents * it.quantity,
    })),
  };
}
