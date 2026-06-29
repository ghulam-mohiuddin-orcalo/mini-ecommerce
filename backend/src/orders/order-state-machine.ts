import { OrderStatus } from '@prisma/client';

/**
 * Allowed order status transitions. The ONLY source of truth for the lifecycle:
 *   PENDING → PROCESSING → SHIPPED → DELIVERED
 *   PENDING → CANCELLED,  PROCESSING → CANCELLED
 * DELIVERED and CANCELLED are terminal (no outgoing transitions), so e.g.
 * DELIVERED→PENDING or CANCELLED→SHIPPED are impossible.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Transitioning into CANCELLED must restore stock. */
export function isCancellation(to: OrderStatus): boolean {
  return to === OrderStatus.CANCELLED;
}
