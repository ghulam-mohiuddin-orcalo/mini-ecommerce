import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class TopProductDto {
  @ApiProperty() productId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty() unitsSold!: number;
}

export class RecentOrderDto {
  @ApiProperty() id!: string;
  @ApiProperty() customerName!: string;
  @ApiProperty() totalCents!: number;
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class AnalyticsResponseDto {
  @ApiProperty({ description: 'Sum of non-cancelled order totals, in cents' })
  totalSalesCents!: number;

  @ApiProperty({ description: 'Count of all orders' })
  totalOrders!: number;

  @ApiProperty({ description: 'Order count keyed by status', example: { PENDING: 2, DELIVERED: 5 } })
  ordersByStatus!: Record<OrderStatus, number>;

  @ApiProperty({ type: TopProductDto, isArray: true })
  topProducts!: TopProductDto[];

  @ApiProperty({ type: RecentOrderDto, isArray: true })
  recentOrders!: RecentOrderDto[];
}
