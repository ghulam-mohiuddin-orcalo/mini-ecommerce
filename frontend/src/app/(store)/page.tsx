'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { ProductGrid, ProductGridSkeleton } from '@/components/store/ProductGrid';
import { RecommendationsSection } from '@/components/store/RecommendationsSection';
import { Hero } from '@/components/store/Hero';
import { CategoryGrid } from '@/components/store/CategoryGrid';
import { FlashSale } from '@/components/store/FlashSale';
import { SectionHeader } from '@/components/store/SectionHeader';
import { Philosophy } from '@/components/store/Philosophy';
import { ProductCarousel } from '@/components/store/ProductCarousel';
import { useProducts } from '@/lib/hooks/useProducts';
import { useMe } from '@/lib/hooks/useAuth';
import { useRecommendations } from '@/lib/hooks/useRecommendations';
import { useFeaturedReviews } from '@/lib/hooks/useReviews';
import { fallbackTestimonials, toHomeTestimonial } from '@/lib/testimonials';
import type { Product } from '@/lib/types';

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
  const apiTestimonials = useMemo(
    () => (reviews.data ?? []).slice(0, 3).map((review, index) => toHomeTestimonial(review, index)),
    [reviews.data],
  );
  const testimonials = apiTestimonials.length > 0 ? apiTestimonials : fallbackTestimonials;

  return (
    <div>
      {/* Hero + brand strip (Verdant reference port) */}
      <Hero />

      {/* Shop by category (Verdant reference port) */}
      <CategoryGrid />

      {/* Flash sale band (Verdant reference port) */}
      {(isLoading || onSale.length > 0) && (
        <FlashSale products={onSale} isLoading={isLoading} deadline={saleDeadline} />
      )}

      {/* New arrivals — same 1320 container + reusable SectionHeader as Shop by category / Flash sale */}
      <section id="new-arrivals" className="v-section scroll-mt-20">
        <SectionHeader eyebrow="Just landed" title="New arrivals" viewAllHref="/products" />
        {isLoading ? (
          <ProductGridSkeleton count={4} className="grid grid-cols-2 gap-5 lg:grid-cols-4" />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <ProductGrid products={newArrivals} className="grid grid-cols-2 gap-5 lg:grid-cols-4" />
        )}
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
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

      </div>

      {/* Our philosophy split panel (Verdant reference port) */}
      <Philosophy />

      {/* Recommended for you — single-row carousel, same 1320 container + SectionHeader */}
      {(recs.isLoading || (recs.data?.items?.length ?? 0) > 0) && (
        <section className="v-section scroll-mt-24" aria-label="Recommended products">
          <SectionHeader
            eyebrow="For you"
            title={user ? 'Recommended for you' : 'Popular right now'}
          />
          <ProductCarousel
            products={recs.data?.items}
            isLoading={recs.isLoading}
            ariaLabel={user ? 'Recommended for you' : 'Popular right now'}
          />
        </section>
      )}

      {/* Testimonials (real featured reviews with reference-copy fallback) */}
      <section className="v-testimonials-section" aria-labelledby="testimonials-title">
        <div className="v-testimonials-inner">
          <div className="v-testimonials-header">
            <p className="v-testimonials-eyebrow">Kind words</p>
            <h2 id="testimonials-title" className="v-testimonials-title">
              Loved in homes everywhere
            </h2>
          </div>
          {reviews.isLoading ? (
            <div className="v-testimonials-grid" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[251px] w-full rounded-[21px]" />
              ))}
            </div>
          ) : (
            <ul className="v-testimonials-grid">
              {testimonials.slice(0, 3).map((testimonial) => (
                <li key={testimonial.id} className="v-testimonial-card">
                  <div
                    className="v-testimonial-stars"
                    role="img"
                    aria-label={`Rated ${testimonial.rating.toFixed(1)} out of 5`}
                  >
                    <span aria-hidden="true">★★★★★</span>
                  </div>
                  <blockquote className="v-testimonial-quote">
                    &quot;{testimonial.quote}&quot;
                  </blockquote>
                  <div className="v-testimonial-buyer">
                    <span
                      className="v-testimonial-avatar"
                      data-tone={testimonial.avatarTone}
                      aria-hidden="true"
                    >
                      {testimonial.initials}
                    </span>
                    <div>
                      <div className="v-testimonial-name">{testimonial.customerName}</div>
                      <div className="v-testimonial-meta">Verified buyer</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

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
