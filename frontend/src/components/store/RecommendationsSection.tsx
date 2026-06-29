import type { Product } from '@/lib/types';
import { ProductGrid, ProductGridSkeleton } from './ProductGrid';

/**
 * Reusable "recommended products" block. Reuses the standard product grid/card.
 * Gracefully renders nothing when there's nothing to show (no products and not loading) —
 * a recommendation strip should never leave an empty heading on the page.
 */
export function RecommendationsSection({
  title,
  products,
  isLoading,
  count = 4,
}: {
  title: string;
  products: Product[] | undefined;
  isLoading: boolean;
  count?: number;
}) {
  if (!isLoading && (!products || products.length === 0)) return null;

  return (
    <section className="pb-4">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight text-ink">{title}</h2>
      {isLoading ? (
        <ProductGridSkeleton count={count} />
      ) : (
        <ProductGrid products={products ?? []} />
      )}
    </section>
  );
}
