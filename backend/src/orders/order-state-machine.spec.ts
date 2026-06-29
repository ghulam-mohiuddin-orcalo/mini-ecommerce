import { OrderStatus } from '@prisma/client';
import { ALLOWED_TRANSITIONS, canTransition, isCancellation } from './order-state-machine';

/**
 * Pure unit tests for the order lifecycle. The state machine is the single source of truth for
 * which status changes are legal, so it's worth exercising in isolation (fast, no DB).
 *
 *   PENDING → PROCESSING → SHIPPED → DELIVERED
 *   PENDING → CANCELLED,  PROCESSING → CANCELLED
 *   DELIVERED and CANCELLED are terminal.
 */
describe('order-state-machine', () => {
  const ALL = Object.values(OrderStatus);

  describe('canTransition — valid forward transitions', () => {
    const valid: Array<[OrderStatus, OrderStatus]> = [
      [OrderStatus.PENDING, OrderStatus.PROCESSING],
      [OrderStatus.PENDING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING, OrderStatus.SHIPPED],
      [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED, OrderStatus.DELIVERED],
    ];
    it.each(valid)('allows %s → %s', (from, to) => {
      expect(canTransition(from, to)).toBe(true);
    });
  });

  describe('canTransition — illegal transitions', () => {
    it('rejects skipping a step (PENDING → SHIPPED, PENDING → DELIVERED)', () => {
      expect(canTransition(OrderStatus.PENDING, OrderStatus.SHIPPED)).toBe(false);
      expect(canTransition(OrderStatus.PENDING, OrderStatus.DELIVERED)).toBe(false);
    });

    it('rejects moving backwards (PROCESSING → PENDING, SHIPPED → PROCESSING)', () => {
      expect(canTransition(OrderStatus.PROCESSING, OrderStatus.PENDING)).toBe(false);
      expect(canTransition(OrderStatus.SHIPPED, OrderStatus.PROCESSING)).toBe(false);
    });

    it('rejects cancelling once SHIPPED or DELIVERED', () => {
      expect(canTransition(OrderStatus.SHIPPED, OrderStatus.CANCELLED)).toBe(false);
      expect(canTransition(OrderStatus.DELIVERED, OrderStatus.CANCELLED)).toBe(false);
    });

    it('treats DELIVERED and CANCELLED as terminal (no outgoing transitions)', () => {
      expect(ALLOWED_TRANSITIONS[OrderStatus.DELIVERED]).toEqual([]);
      expect(ALLOWED_TRANSITIONS[OrderStatus.CANCELLED]).toEqual([]);
      for (const to of ALL) {
        expect(canTransition(OrderStatus.DELIVERED, to)).toBe(false);
        expect(canTransition(OrderStatus.CANCELLED, to)).toBe(false);
      }
    });

    it('rejects a no-op transition to the same status', () => {
      for (const status of ALL) {
        expect(canTransition(status, status)).toBe(false);
      }
    });
  });

  describe('isCancellation', () => {
    it('is true only for CANCELLED', () => {
      expect(isCancellation(OrderStatus.CANCELLED)).toBe(true);
      for (const status of ALL.filter((s) => s !== OrderStatus.CANCELLED)) {
        expect(isCancellation(status)).toBe(false);
      }
    });
  });

  it('every status has an explicit transition list (no undefined lookups)', () => {
    for (const status of ALL) {
      expect(Array.isArray(ALLOWED_TRANSITIONS[status])).toBe(true);
    }
  });
});
