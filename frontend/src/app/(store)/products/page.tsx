'use client';

import { Suspense, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CatalogFilters } from '@/components/store/CatalogFilters';
import { Pagination } from '@/components/store/Pagination';
import { ProductGrid, ProductGridSkeleton } from '@/components/store/ProductGrid';
import { Container } from '@/components/store/Container';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useCategories, useProducts } from '@/lib/hooks/useProducts';
import { cn } from '@/lib/cn';
import type { ProductQuery, ProductSort } from '@/lib/types';

const VALID_SORTS: ProductSort[] = ['newest', 'price_asc', 'price_desc'];

function parseQuery(sp: URLSearchParams): ProductQuery {
  const num = (key: string): number | undefined => {
    const raw = sp.get(key);
    if (raw === null || raw === '') return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };
  const sortRaw = sp.get('sort') as ProductSort | null;
  return {
    search: sp.get('search') ?? undefined,
    category: sp.get('category') ?? undefined,
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    minRating: num('minRating'),
    sort: sortRaw && VALID_SORTS.includes(sortRaw) ? sortRaw : 'newest',
    page: num('page') ?? 1,
    pageSize: 12,
  };
}

function CatalogClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query = parseQuery(searchParams);
  const { data, isLoading, isError, isFetching, refetch } = useProducts(query);
  const { data: categories = [] } = useCategories();

  const minRating = query.minRating;

  const writeParams = useCallback(
    (next: ProductQuery) => {
      const usp = new URLSearchParams();
      if (next.search) usp.set('search', next.search);
      if (next.category) usp.set('category', next.category);
      if (next.minPrice !== undefined) usp.set('minPrice', String(next.minPrice));
      if (next.maxPrice !== undefined) usp.set('maxPrice', String(next.maxPrice));
      if (next.minRating !== undefined) usp.set('minRating', String(next.minRating));
      if (next.sort && next.sort !== 'newest') usp.set('sort', next.sort);
      if (next.page && next.page > 1) usp.set('page', String(next.page));
      const qs = usp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  // Filter changes reset to page 1; pagination keeps the rest of the query.
  const updateFilters = useCallback(
    (partial: Partial<ProductQuery>) => writeParams({ ...query, ...partial, page: 1 }),
    [query, writeParams],
  );
  const setRating = useCallback(
    (rating: number | undefined) => writeParams({ ...query, minRating: rating, page: 1 }),
    [query, writeParams],
  );
  const setPage = useCallback(
    (page: number) => writeParams({ ...query, page }),
    [query, writeParams],
  );
  const clearAll = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  const hasActiveFilters = Boolean(
    query.search ||
      query.category ||
      query.minPrice !== undefined ||
      query.maxPrice !== undefined ||
      minRating !== undefined,
  );
  const meta = data?.meta;

  // Rating is filtered server-side (see useProducts → /products?minRating), so the returned
  // page is already correct and paginated across the whole catalog.
  const products = data?.data ?? [];

  return (
    <Container className="py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-medium tracking-tight text-ink sm:text-[38px]">Catalog</h1>
          <p className="mt-1.5 text-sm text-muted">
            {meta
              ? `${meta.total} product${meta.total === 1 ? '' : 's'} · curated for everyday use`
              : 'Browse our products'}
          </p>
        </div>
        <SortToggle value={query.sort ?? 'newest'} onChange={(sort) => updateFilters({ sort })} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <CatalogFilters
            value={query}
            categories={categories}
            minRating={minRating}
            onChange={updateFilters}
            onRatingChange={setRating}
            onClear={clearAll}
            hasActiveFilters={hasActiveFilters}
          />
        </aside>

        <section aria-busy={isFetching}>
          {isLoading ? (
            <ProductGridSkeleton count={6} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : products.length === 0 ? (
            <EmptyState
              title="No products match your filters"
              description={
                minRating !== undefined
                  ? 'No products meet that rating threshold. Try lowering it or clearing filters.'
                  : 'Try widening your price range or clearing the search.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="secondary" onClick={clearAll}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="flex flex-col gap-8">
              <ProductGrid products={products} />
              {meta && (
                <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
              )}
            </div>
          )}
        </section>
      </div>
    </Container>
  );
}

const SORT_TABS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
];

function SortToggle({
  value,
  onChange,
}: {
  value: ProductSort;
  onChange: (sort: ProductSort) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-sm font-semibold text-muted">Sort</span>
      <div className="inline-flex gap-0.5 rounded-lg bg-paper-2 p-0.5" role="group" aria-label="Sort products">
        {SORT_TABS.map((tab) => {
          const active = value === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              aria-pressed={active}
              className={cn(
                'rounded-[8px] px-3 py-1.5 text-[13px] font-semibold transition-colors',
                active ? 'bg-surface text-ink shadow-[var(--shadow-card)]' : 'text-ink-soft hover:text-ink',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<Container className="py-8"><ProductGridSkeleton /></Container>}>
      <CatalogClient />
    </Suspense>
  );
}
