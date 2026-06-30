import { Skeleton } from '@/components/ui/Skeleton';
import type { Product, WishlistProduct } from '@/lib/types';
import { ProductCard } from './ProductCard';

const GRID = 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3';

export function ProductGrid({
  products,
  className,
}: {
  products: (Product | WishlistProduct)[];
  className?: string;
}) {
  return (
    <div className={className ?? GRID}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className ?? GRID} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-line bg-surface">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-1 h-5 w-20" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
