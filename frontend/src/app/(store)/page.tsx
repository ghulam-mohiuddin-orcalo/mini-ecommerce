'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Countdown } from '@/components/ui/Countdown';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Rating } from '@/components/ui/Rating';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { ProductGrid, ProductGridSkeleton } from '@/components/store/ProductGrid';
import { RecommendationsSection } from '@/components/store/RecommendationsSection';
import { useProducts, useCategories } from '@/lib/hooks/useProducts';
import { useMe } from '@/lib/hooks/useAuth';
import { useRecommendations } from '@/lib/hooks/useRecommendations';
import { useFeaturedReviews } from '@/lib/hooks/useReviews';
import type { Product } from '@/lib/types';

const STATS = [
  { value: 'Free', label: 'Returns, 30 days' },
  { value: '24h', label: 'Dispatch' },
  { value: '4.8★', label: 'Avg. rating' },
];

/** Map known category names to an icon for the category tiles; unknown → a neutral package. */
function categoryIcon(name: string): IconName {
  const n = name.toLowerCase();
  if (n.includes('apparel') || n.includes('cloth') || n.includes('wear')) return 'shirt';
  if (n.includes('home') || n.includes('living')) return 'home';
  if (n.includes('electro') || n.includes('tech')) return 'cpu';
  if (n.includes('book')) return 'book';
  if (n.includes('outdoor') || n.includes('camp')) return 'tent';
  return 'package';
}

/** End of the current local day — a near-future, client-computed flash-sale deadline. */
function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function HomePage() {
  // One broad, newest-first fetch powers new arrivals + the derived sale/best-seller rails — every
  // rail is driven by REAL backend badge / compareAt data, never a hardcoded product list.
  const { data, isLoading, isError, refetch } = useProducts({ sort: 'newest', pageSize: 50 });
  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: user } = useMe();
  const recs = useRecommendations(user?.id ?? null);
  const reviews = useFeaturedReviews(6);

  const products = useMemo(() => data?.data ?? [], [data]);

  const newArrivals = products.slice(0, 4);

  const onSale = useMemo(
    () =>
      products
        .filter(
          (p) =>
            p.badges.includes('SALE') ||
            (p.compareAtPriceCents != null && p.compareAtPriceCents > p.priceCents),
        )
        .slice(0, 4),
    [products],
  );

  const bestSellers = useMemo(() => {
    const tagged = products.filter(
      (p) => p.badges.includes('BESTSELLER') || p.badges.includes('TRENDING'),
    );
    return tagged.slice(0, 4);
  }, [products]);

  // Fall back to personalized recommendations when nothing is badge-tagged as a best-seller.
  const bestSellerItems: Product[] = bestSellers.length > 0 ? bestSellers : recs.data?.items ?? [];
  const bestSellerLoading = bestSellers.length === 0 && recs.isLoading;

  const saleDeadline = useMemo(() => endOfToday(), []);
  const testimonials = reviews.data ?? [];

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-9 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="pp-rise">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-brand-500 dark:text-brand-300">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-brand-300" />
              Thoughtfully made goods
            </span>
            <h1 className="mt-5 font-serif text-[42px] font-medium leading-[1.05] tracking-tight text-ink sm:text-[56px]">
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
                  <Icon name="arrow-right" size={17} />
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
            <div aria-hidden="true" className="pp-veil absolute inset-0" />
            <div aria-hidden="true" className="pp-glow absolute inset-0" />
            <span className="absolute left-6 top-6 text-[13px] font-bold uppercase tracking-[0.1em] text-white/70">
              Catalog ’25
            </span>
            <span className="absolute inset-x-6 bottom-[88px] font-serif text-[36px] font-medium leading-[1.1] tracking-tight text-white">
              Quiet quality,
              <br />
              built to last.
            </span>
            <span className="absolute bottom-6 left-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur">
              Curated by Pine &amp; Parcel
            </span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">Shop by</p>
          <h2 className="mt-1.5 font-serif text-[26px] font-medium tracking-tight text-ink sm:text-3xl">
            Categories
          </h2>
        </div>
        {catsLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/products?category=${encodeURIComponent(cat)}`}
                className="group flex flex-col items-start justify-between gap-6 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100 dark:text-brand-300">
                  <Icon name={categoryIcon(cat)} size={22} />
                </span>
                <span className="inline-flex items-center gap-1.5 font-bold tracking-tight text-ink">
                  {cat}
                  <Icon name="arrow-right" size={15} className="text-muted transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Flash sale band */}
      {(isLoading || onSale.length > 0) && (
        <section className="relative overflow-hidden border-y border-line bg-brand-900">
          <div aria-hidden="true" className="pp-glow absolute inset-0" />
          <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-accent-400">
                  <Icon name="tag" size={15} /> Flash sale
                </p>
                <h2 className="mt-1.5 font-serif text-[26px] font-medium tracking-tight text-white sm:text-3xl">
                  On sale today only
                </h2>
              </div>
              <div className="flex flex-col items-start gap-1.5 sm:items-end">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Ends in
                </span>
                <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 backdrop-blur [&_.text-ink]:text-white [&_.text-muted]:text-white/70">
                  <Countdown target={saleDeadline} />
                </div>
              </div>
            </div>
            {isLoading ? (
              <ProductGridSkeleton count={4} className="grid grid-cols-2 gap-5 lg:grid-cols-4" />
            ) : (
              <ProductGrid products={onSale} className="grid grid-cols-2 gap-5 lg:grid-cols-4" />
            )}
          </div>
        </section>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* New arrivals */}
        <section id="new-arrivals" className="scroll-mt-20 py-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">Just landed</p>
              <h2 className="mt-1.5 font-serif text-[26px] font-medium tracking-tight text-ink sm:text-3xl">
                New arrivals
              </h2>
            </div>
            <Link
              href="/products"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors hover:underline dark:text-brand-300"
            >
              View all
              <Icon name="arrow-right" size={15} />
            </Link>
          </div>
          {isLoading ? (
            <ProductGridSkeleton count={4} className="grid grid-cols-2 gap-5 lg:grid-cols-4" />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : (
            <ProductGrid products={newArrivals} className="grid grid-cols-2 gap-5 lg:grid-cols-4" />
          )}
        </section>

        {/* Best sellers (real BESTSELLER/TRENDING badges, fallback to recommendations) */}
        <div className="pb-16">
          <RecommendationsSection
            eyebrow="Loved by shoppers"
            title="Best sellers"
            products={bestSellerItems}
            isLoading={bestSellerLoading}
            viewAllHref="/products"
          />
        </div>

        {/* Editorial banner */}
        <section className="relative mb-16 overflow-hidden rounded-2xl shadow-[var(--shadow-panel)]">
          <img
            src="https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1400&h=600&fit=crop&q=80"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden="true" className="pp-veil absolute inset-0" />
          <div aria-hidden="true" className="pp-glow absolute inset-0" />
          <div className="relative flex flex-col items-start gap-4 px-8 py-14 sm:px-12 sm:py-16">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
              The journal
            </span>
            <h2 className="max-w-lg font-serif text-[28px] font-medium leading-tight tracking-tight text-white sm:text-[36px]">
              Stories behind the goods we choose.
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-white/80">
              Material notes, maker profiles, and care guides — read why each piece earns its place.
            </p>
            <Link href="/journal">
              <Button size="lg" variant="secondary" className="mt-1">
                Read the journal
                <Icon name="arrow-right" size={16} />
              </Button>
            </Link>
          </div>
        </section>

        {/* Recommendations band */}
        {(recs.isLoading || (recs.data?.items?.length ?? 0) > 0) && (
          <div className="mb-16 scroll-mt-24 rounded-2xl border border-line bg-paper-2 p-6 sm:p-8">
            <RecommendationsSection
              eyebrow="For you"
              title={user ? 'Recommended for you' : 'Popular right now'}
              products={recs.data?.items}
              isLoading={recs.isLoading}
            />
          </div>
        )}
      </div>

      {/* Testimonials (real featured reviews) */}
      {(reviews.isLoading || testimonials.length > 0) && (
        <section className="border-y border-line bg-paper-2">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="mb-7 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">Kind words</p>
              <h2 className="mt-1.5 font-serif text-[26px] font-medium tracking-tight text-ink sm:text-3xl">
                What shoppers say
              </h2>
            </div>
            {reviews.isLoading ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {testimonials.slice(0, 3).map((review) => (
                  <li
                    key={review.id}
                    className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]"
                  >
                    <Rating value={review.rating} size="sm" />
                    {review.title && (
                      <p className="font-bold tracking-tight text-ink">{review.title}</p>
                    )}
                    <p className="flex-1 text-sm leading-relaxed text-ink-soft">“{review.body}”</p>
                    <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3">
                      <span className="text-sm font-semibold text-ink">{review.userName}</span>
                      <Link
                        href={`/products/${review.product.id}`}
                        className="line-clamp-1 text-xs font-semibold text-brand-600 transition-colors hover:underline dark:text-brand-300"
                      >
                        {review.product.name}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Newsletter prompt */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface px-6 py-12 text-center shadow-[var(--shadow-card)]">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:text-brand-300">
            <Icon name="mail" size={24} />
          </span>
          <h2 className="font-serif text-[24px] font-medium tracking-tight text-ink sm:text-[28px]">
            Stay in the loop
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted">
            New arrivals, restocks, and the occasional quiet sale — no noise, just the good stuff.
          </p>
          <Link href="/contact" className="mt-1">
            <Button size="lg">
              Get in touch
              <Icon name="arrow-right" size={16} />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
