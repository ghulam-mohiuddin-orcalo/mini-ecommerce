'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';
import { ProductGrid, ProductGridSkeleton } from '@/components/store/ProductGrid';
import { RecommendationsSection } from '@/components/store/RecommendationsSection';
import { useProducts } from '@/lib/hooks/useProducts';
import { useMe } from '@/lib/hooks/useAuth';
import { useRecommendations } from '@/lib/hooks/useRecommendations';

export default function HomePage() {
  const { data, isLoading, isError, refetch } = useProducts({ sort: 'newest', pageSize: 3 });
  const { data: user } = useMe();
  const recs = useRecommendations(user?.id ?? null);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="flex flex-col items-center gap-6 py-16 text-center sm:py-24">
        <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700">
          Thoughtfully made goods
        </span>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Everyday essentials, carefully chosen.
        </h1>
        <p className="max-w-prose text-muted">
          A small catalog of apparel, home, electronics, books, and outdoor gear — browse,
          filter, and find something you’ll keep.
        </p>
        <div className="flex gap-3">
          <Link href="/products">
            <Button size="lg">Browse the catalog</Button>
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">New arrivals</h2>
          <Link href="/products" className="text-sm font-medium text-brand-700 hover:underline">
            View all →
          </Link>
        </div>
        {isLoading ? (
          <ProductGridSkeleton count={3} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <ProductGrid products={data?.data ?? []} />
        )}
      </section>

      <div className="pb-20">
        <RecommendationsSection
          title={user ? 'Recommended for you' : 'Popular right now'}
          products={recs.data?.items}
          isLoading={recs.isLoading}
        />
      </div>
    </div>
  );
}
