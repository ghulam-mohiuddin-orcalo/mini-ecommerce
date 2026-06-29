import { Badge } from '@/components/ui/Badge';
import type { OrderStatus } from '@/lib/types';

const TONE: Record<OrderStatus, 'neutral' | 'brand' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  PROCESSING: 'brand',
  SHIPPED: 'brand',
  DELIVERED: 'neutral',
  CANCELLED: 'danger',
};

const LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONE[status]}>{LABEL[status]}</Badge>;
}
