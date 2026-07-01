import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentRequiredException } from '../common/exceptions/payment-required.exception';
import { PAYMENT_PROVIDER, PaymentProvider } from '../payments/payment.interface';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderResponseDto, OrderWithItems, toOrderResponse } from './dto/order-response.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import {
  AdminOrderResponseDto,
  PaginatedAdminOrdersDto,
  toAdminOrderResponse,
} from './dto/admin-order-response.dto';
import { canTransition, isCancellation } from './order-state-machine';

interface PreparedItem {
  productId: string;
  productName: string;
  productImageUrl: string;
  productCategory: string;
  variantId: string | null;
  variantLabel: string | null;
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
   * The integrity core, shared by every checkout path. Everything happens inside ONE
   * interactive transaction, so any failure (inactive product, insufficient stock, declined
   * payment) rolls the whole thing back: no order, no stock change, cart untouched.
   *
   * Steps, in order:
   *  1. (Stripe) Idempotency short-circuit: if this Checkout Session already produced an order,
   *     return it untouched — duplicate webhook deliveries never double-fulfil.
   *  2. Load the cart (must be non-empty).
   *  3. For each line: re-read the product from the DB (never trust client/cart prices),
   *     snapshot its CURRENT price/name, and atomically decrement stock with a conditional
   *     update that is the real oversell guard.
   *  4. Compute the authoritative total server-side from the snapshots.
   *  5. `settle(total)` records/validates payment. Mock charge runs here (a decline throws and
   *     rolls back); for Stripe, payment is already captured, so this just returns its reference.
   *  6. Create the Order + OrderItems from the snapshots and persist the total.
   *  7. Clear the cart — reached only on success, so it commits atomically with the order.
   */
  private createOrderFromCart(
    userId: string,
    settle: (totalCents: number) => Promise<{ reference: string | null }>,
    opts: { stripeSessionId?: string; expectedTotalCents?: number } = {},
  ): Promise<OrderWithItems> {
    return this.prisma.$transaction(async (tx) => {
      if (opts.stripeSessionId) {
        const existing = await tx.order.findUnique({
          where: { stripeSessionId: opts.stripeSessionId },
          include: { items: true },
        });
        if (existing) return existing;
      }

      const cart = await tx.cart.findUnique({ where: { userId }, include: { items: true } });
      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Your cart is empty');
      }

      const prepared: PreparedItem[] = [];
      let totalCents = 0;

      for (const item of cart.items) {
        // Re-read from the DB — never trust the cart's implied price/availability. The parent
        // product is always the source of the name/image/category snapshot, even for variants.
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { category: true },
        });
        if (!product || !product.isActive) {
          throw new ConflictException(
            `"${product?.name ?? 'A product in your cart'}" is no longer available`,
          );
        }

        if (item.variantId) {
          // Variant line: price and stock are authoritative on the VARIANT row, so the atomic
          // conditional decrement targets ProductVariant. Same oversell guarantee as below —
          // the row-level update serializes the WHERE + decrement under concurrent checkouts.
          const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (!variant || !variant.isActive || variant.productId !== product.id) {
            throw new ConflictException(
              `"${product.name}" is no longer available in the selected option`,
            );
          }

          const decremented = await tx.productVariant.updateMany({
            where: { id: variant.id, isActive: true, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (decremented.count === 0) {
            throw new ConflictException(
              `Not enough stock for "${product.name}" (${variant.label}) (only ${variant.stock} left)`,
            );
          }

          const unitPriceCents = variant.priceCents; // current variant price, snapshotted
          totalCents += unitPriceCents * item.quantity;
          prepared.push({
            productId: product.id,
            productName: product.name,
            productImageUrl: product.imageUrl,
            productCategory: product.category.name,
            variantId: variant.id,
            variantLabel: variant.label,
            unitPriceCents,
            quantity: item.quantity,
          });
          continue;
        }

        // Variant-less line — unchanged behaviour. Atomic, conditional decrement: only succeeds
        // if enough stock is still available and the product is active. This is the authoritative
        // guard against overselling, even under concurrent checkouts (row-level update serializes
        // the WHERE + decrement).
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
          productCategory: product.category.name,
          variantId: null,
          variantLabel: null,
          unitPriceCents,
          quantity: item.quantity,
        });
      }

      // Amount integrity: the amount the customer was charged was fixed when the PaymentIntent
      // (or Checkout Session) was created from the cart. It must equal the total we just recomputed
      // from authoritative DB prices. If the cart changed after payment was authorized, fail
      // safely — the transaction rolls back, no order is created and no stock is consumed (a real
      // system would refund the now-orphaned payment). This makes client-side amount tampering or
      // a stale-tab race impossible to turn into a mispriced order.
      if (opts.expectedTotalCents !== undefined && opts.expectedTotalCents !== totalCents) {
        throw new ConflictException(
          'The order total changed after payment was authorized; no order was created.',
        );
      }

      const { reference } = await settle(totalCents);

      const created = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          totalCents,
          paymentRef: reference,
          paidAt: new Date(),
          stripeSessionId: opts.stripeSessionId ?? null,
          items: { create: prepared },
        },
        include: { items: true },
      });

      // Cleared only because we reached here; rolls back with everything else on failure.
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });
  }

  /**
   * Mock checkout (legacy / non-Stripe path). Charges the swappable PaymentProvider inside the
   * transaction; a decline rolls everything back. Retained so the transactional core stays
   * exercised and swappable — the Stripe path below reuses the very same core.
   */
  async checkout(userId: string, dto: CheckoutDto): Promise<OrderResponseDto> {
    const order = await this.createOrderFromCart(userId, async (totalCents) => {
      const payment = await this.payment.charge({ amountCents: totalCents, token: dto.paymentToken });
      if (payment.status === 'failed') {
        throw new PaymentRequiredException(payment.failureReason ?? 'Payment failed');
      }
      return { reference: payment.reference };
    });
    return toOrderResponse(order);
  }

  /**
   * Fulfil a paid Stripe Checkout Session — the ONLY way a Stripe order is created, and only
   * after Stripe has confirmed payment (called from the verified webhook and the success-page
   * reconciliation). Reuses the transactional core: re-reads products, re-validates stock, and
   * recomputes the total server-side; payment is already captured, so nothing is charged here.
   *
   * Idempotent two ways: the in-transaction lookup on `stripeSessionId` returns an existing
   * order, and the UNIQUE constraint on that column makes a concurrent double-delivery race
   * safe — the loser's whole transaction (including its stock decrements) rolls back, so the
   * order is created EXACTLY ONCE and stock is decremented exactly once.
   */
  async fulfillStripeCheckout(input: {
    sessionId: string;
    userId: string;
    paymentRef: string | null;
    /** The amount Stripe actually authorized (minor units). Asserted against the recomputed total. */
    expectedTotalCents?: number;
  }): Promise<OrderResponseDto> {
    try {
      const order = await this.createOrderFromCart(
        input.userId,
        () => Promise.resolve({ reference: input.paymentRef }),
        { stripeSessionId: input.sessionId, expectedTotalCents: input.expectedTotalCents },
      );
      return toOrderResponse(order);
    } catch (e) {
      // Concurrent duplicate delivery lost the UNIQUE race — return the winner's order.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const existing = await this.prisma.order.findUnique({
          where: { stripeSessionId: input.sessionId },
          include: { items: true },
        });
        if (existing) return toOrderResponse(existing);
      }
      throw e;
    }
  }

  /** Look up an order by its Stripe Checkout Session id (success-page reconciliation). */
  async findByStripeSession(userId: string, sessionId: string): Promise<OrderResponseDto | null> {
    const order = await this.prisma.order.findUnique({
      where: { stripeSessionId: sessionId },
      include: { items: true },
    });
    // Ownership guard: never reveal another user's order via a guessed session id.
    if (!order || order.userId !== userId) return null;
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

  // --- Admin -----------------------------------------------------------------------

  /** All orders (admin), optionally filtered by status and customer name/email, paginated. */
  async findAllForAdmin(query: AdminOrderQueryDto): Promise<PaginatedAdminOrdersDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.user = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { items: true, user: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map(toAdminOrderResponse),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * Admin status change, enforced by the state machine. Invalid transitions are rejected (409).
   * Cancelling a PENDING/PROCESSING order restores each line's stock — atomically with the
   * status change, so stock and status never drift apart.
   */
  async updateStatus(orderId: string, nextStatus: OrderStatus): Promise<AdminOrderResponseDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      if (!canTransition(order.status, nextStatus)) {
        throw new ConflictException(
          `Cannot change order status from ${order.status} to ${nextStatus}`,
        );
      }

      if (isCancellation(nextStatus)) {
        for (const item of order.items) {
          // Restock the SAME row that was decremented at checkout: the variant when the line had
          // one, otherwise the parent product. (Mirrors createOrderFromCart's variant-aware
          // decrement — restocking the product for a variant line would corrupt both counts.)
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
        include: { items: true, user: true },
      });
    });

    return toAdminOrderResponse(updated);
  }
}
