import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Animated placeholder block used while content loads (warm shimmer, calm cadence). */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('pp-skeleton rounded-md', className)} {...props} />;
}
