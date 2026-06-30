import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import type { Product } from '@/lib/types';
import { ProductGrid, ProductGridSkeleton } from './ProductGrid';

/**
 * Reusable "recommended products" block. Reuses the standard product grid/card.
 * Gracefully renders nothing when there's nothing to show (no products and not loading) —
 * a recommendation strip should never leave an empty heading on the page.
 */
export function RecommendationsSection({
  title,
  eyebrow,
  products,
  isLoading,
  count = 4,
  viewAllHref,
}: {
  title: string;
  eyebrow?: string;
  products: Product[] | undefined;
  isLoading: boolean;
  count?: number;
  viewAllHref?: string;
}) {
  if (!isLoading && (!products || products.length === 0)) return null;

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">{eyebrow}</p>
          )}
          <h2 className="mt-1.5 font-serif text-[26px] font-medium tracking-tight text-ink sm:text-3xl">
            {title}
          </h2>
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors hover:underline dark:text-brand-300"
          >
            View all
            <Icon name="arrow-right" size={15} />
          </Link>
        )}
      </div>
      {isLoading ? (
        <ProductGridSkeleton count={count} className="grid grid-cols-2 gap-5 lg:grid-cols-4" />
      ) : (
        <ProductGrid
          products={products ?? []}
          className="grid grid-cols-2 gap-5 lg:grid-cols-4"
        />
      )}
    </section>
  );
}
