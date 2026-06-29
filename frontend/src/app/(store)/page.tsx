'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';
import { ProductGrid, ProductGridSkeleton } from '@/components/store/ProductGrid';
import { RecommendationsSection } from '@/components/store/RecommendationsSection';
import { useProducts } from '@/lib/hooks/useProducts';
import { useMe } from '@/lib/hooks/useAuth';
import { useRecommendations } from '@/lib/hooks/useRecommendations';

const STATS = [
  { value: '5', label: 'Categories' },
  { value: 'Free', label: 'Returns, 30 days' },
  { value: '24h', label: 'Dispatch' },
];

export default function HomePage() {
  const { data, isLoading, isError, refetch } = useProducts({ sort: 'newest', pageSize: 3 });
  const { data: user } = useMe();
  const recs = useRecommendations(user?.id ?? null);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Hero */}
      <section className="grid grid-cols-1 items-center gap-9 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="pp-rise">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-brand-500">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Thoughtfully made goods
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.04] tracking-tight text-ink sm:text-5xl">
            Everyday essentials, carefully chosen.
          </h1>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft">
            A small catalog of apparel, home, electronics, books, and outdoor gear — browse,
            filter, and find something you’ll keep.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/products">
              <Button size="lg">
                Browse the catalog
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Button>
            </Link>
            <a href="#new-arrivals">
              <Button size="lg" variant="secondary">
                New arrivals
              </Button>
            </a>
          </div>
          <dl className="mt-8 flex flex-wrap gap-6">
            {STATS.map((s, i) => (
              <div key={s.label} className="flex items-center gap-6">
                {i > 0 && <span aria-hidden="true" className="h-8 w-px bg-line" />}
                <div>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="text-[22px] font-extrabold tracking-tight text-ink">{s.value}</dd>
                  <p className="text-xs font-semibold text-muted">{s.label}</p>
                </div>
              </div>
            ))}
          </dl>
        </div>

        {/* Brand panel — curated-goods photo under a brand-tinted overlay */}
        <div
          aria-hidden="true"
          className="pp-rise-delay relative hidden aspect-square overflow-hidden rounded-2xl shadow-[var(--shadow-panel)] lg:block"
        >
          <img
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&h=1000&fit=crop&q=80"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(150deg,rgba(36,75,60,.88),rgba(44,93,74,.6) 45%,rgba(60,119,94,.42))' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(120% 80% at 80% 10%,rgba(199,154,82,.32),transparent 55%)' }}
          />
          <span className="absolute left-6 top-6 text-[13px] font-bold uppercase tracking-[0.1em] text-white/70">
            Catalog ’25
          </span>
          <span className="absolute inset-x-6 bottom-[88px] text-[34px] font-extrabold leading-[1.1] tracking-tight text-white">
            Quiet quality,
            <br />
            built to last.
          </span>
          <span className="absolute bottom-6 left-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur">
            Curated by Pine &amp; Parcel
          </span>
        </div>
      </section>

      {/* New arrivals */}
      <section id="new-arrivals" className="scroll-mt-20 pb-16">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">Just landed</p>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
              New arrivals
            </h2>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
          >
            View all
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
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

      {/* Recommendations band */}
      {(recs.isLoading || (recs.data?.items?.length ?? 0) > 0) && (
        <div id="recommended" className="mb-20 scroll-mt-24 rounded-2xl border border-line bg-paper-2 p-6 sm:p-8">
          <RecommendationsSection
            eyebrow="For you"
            title={user ? 'Recommended for you' : 'Popular right now'}
            products={recs.data?.items}
            isLoading={recs.isLoading}
          />
        </div>
      )}
    </div>
  );
}
