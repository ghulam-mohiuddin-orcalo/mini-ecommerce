import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Animated placeholder block used while content loads. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-line/70', className)}
      {...props}
    />
  );
}
