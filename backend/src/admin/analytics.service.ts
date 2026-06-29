import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsResponseDto } from './dto/analytics-response.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<AnalyticsResponseDto> {
    const [salesAgg, totalOrders, statusGroups, topRaw, recent] = await Promise.all([
      // Revenue excludes cancelled orders.
      this.prisma.order.aggregate({
        _sum: { totalCents: true },
        where: { status: { not: OrderStatus.CANCELLED } },
      }),
      this.prisma.order.count(),
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      // Top sellers by units, from non-cancelled orders, grouped on the snapshot name.
      this.prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: { order: { status: { not: OrderStatus.CANCELLED } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      this.prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      }),
    ]);

    const ordersByStatus = Object.values(OrderStatus).reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<OrderStatus, number>,
    );
    for (const group of statusGroups) {
      ordersByStatus[group.status] = group._count._all;
    }

    return {
      totalSalesCents: salesAgg._sum.totalCents ?? 0,
      totalOrders,
      ordersByStatus,
      topProducts: topRaw.map((t) => ({
        productId: t.productId,
        productName: t.productName,
        unitsSold: t._sum.quantity ?? 0,
      })),
      recentOrders: recent.map((o) => ({
        id: o.id,
        customerName: o.user.name,
        totalCents: o.totalCents,
        status: o.status,
        createdAt: o.createdAt,
      })),
    };
  }
}
