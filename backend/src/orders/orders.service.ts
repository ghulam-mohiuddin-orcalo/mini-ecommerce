import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentRequiredException } from '../common/exceptions/payment-required.exception';
import { PAYMENT_PROVIDER, PaymentProvider } from '../payments/payment.interface';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderResponseDto, toOrderResponse } from './dto/order-response.dto';

interface PreparedItem {
  productId: string;
  productName: string;
  productImageUrl: string;
  productCategory: string;
  unitPriceCents: number;
  quantity: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly payment: PaymentProvider,
  ) {}

  /**
   * Checkout — the integrity core. Everything below happens inside ONE interactive
   * transaction, so any failure (inactive product, insufficient stock, declined payment)
   * rolls the whole thing back: no order, no stock change, cart untouched.
   *
   * Steps, in order:
   *  1. Load the cart (must be non-empty).
   *  2. For each line: re-read the product, snapshot its CURRENT price/name, and atomically
   *     decrement stock with a conditional update that is the real oversell guard.
   *  3. Compute the authoritative total server-side from the snapshots.
   *  4. Charge the (mock) payment; a decline throws and rolls everything back.
   *  5. Create the Order + OrderItems from the snapshots and persist the total.
   *  6. Clear the cart — reached only on success, so it commits atomically with the order.
   */
  async checkout(userId: string, dto: CheckoutDto): Promise<OrderResponseDto> {
    const order = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({ where: { userId }, include: { items: true } });
      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Your cart is empty');
      }

      const prepared: PreparedItem[] = [];
      let totalCents = 0;

      for (const item of cart.items) {
        // Re-read from the DB — never trust the cart's implied price/availability.
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || !product.isActive) {
          throw new ConflictException(
            `"${product?.name ?? 'A product in your cart'}" is no longer available`,
          );
        }

        // Atomic, conditional decrement: only succeeds if enough stock is still available and
        // the product is active. This is the authoritative guard against overselling, even
        // under concurrent checkouts (row-level update serializes the WHERE + decrement).
        const decremented = await tx.product.updateMany({
          where: { id: product.id, isActive: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (decremented.count === 0) {
          throw new ConflictException(
            `Not enough stock for "${product.name}" (only ${product.stock} left)`,
          );
        }

        const unitPriceCents = product.priceCents; // current price, snapshotted
        totalCents += unitPriceCents * item.quantity;
        prepared.push({
          productId: product.id,
          productName: product.name,
          productImageUrl: product.imageUrl,
          productCategory: product.category,
          unitPriceCents,
          quantity: item.quantity,
        });
      }

      // Charge for the server-computed total (mock). A decline rolls back the whole tx.
      const payment = await this.payment.charge({ amountCents: totalCents, token: dto.paymentToken });
      if (payment.status === 'failed') {
        throw new PaymentRequiredException(payment.failureReason ?? 'Payment failed');
      }

      const created = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          totalCents,
          paymentRef: payment.reference,
          paidAt: new Date(),
          items: { create: prepared },
        },
        include: { items: true },
      });

      // Cleared only because we reached here; rolls back with everything else on failure.
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    return toOrderResponse(order);
  }

  /** The authenticated user's orders, newest first. */
  async findMyOrders(userId: string): Promise<OrderResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(toOrderResponse);
  }

  /** A single order owned by the user. 404 (not 403) if it isn't theirs — never reveals others'. */
  async findMyOrder(userId: string, orderId: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return toOrderResponse(order);
  }
}
