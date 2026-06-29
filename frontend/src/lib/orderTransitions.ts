import type { OrderStatus } from '@/lib/types';

/**
 * Mirror of the backend state machine — used only to render the valid action buttons.
 * The server remains the authority and re-validates every transition.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const TRANSITION_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Mark pending',
  PROCESSING: 'Mark processing',
  SHIPPED: 'Mark shipped',
  DELIVERED: 'Mark delivered',
  CANCELLED: 'Cancel order',
};
