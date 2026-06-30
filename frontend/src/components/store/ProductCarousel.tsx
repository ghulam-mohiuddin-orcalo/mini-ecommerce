'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product, WishlistProduct } from '@/lib/types';
import { ProductCard } from './ProductCard';

/* ----------------------------------------------------------------------------
 * Premium single-row product carousel. A snap-scrolling rail that reuses the
 * standard ProductCard, so wishlist / links / prices / add-to-cart / badges are
 * all unchanged — this only owns layout + navigation.
 *
 * Inputs supported: trackpad / touch swipe (native overflow scroll), mouse
 * drag-to-scroll (pointer events, mouse only — touch keeps native momentum),
 * keyboard (←/→ page, Home/End jump), and hover-revealed prev/next buttons on
 * pointer-capable wide screens. Card sizing + the responsive cards-per-view live
 * in the `v-carousel-*` classes in globals.css.
 * -------------------------------------------------------------------------- */

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

function CarouselSkeleton({ count }: { count: number }) {
  return (
    <div className="v-carousel" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="v-carousel-slide">
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="pp-skeleton aspect-[4/3] w-full" />
            <div className="flex flex-col gap-2 p-4">
              <div className="pp-skeleton h-3 w-16 rounded" />
              <div className="pp-skeleton h-4 w-3/4 rounded" />
              <div className="pp-skeleton h-3 w-24 rounded" />
              <div className="pp-skeleton mt-1 h-5 w-20 rounded" />
              <div className="pp-skeleton mt-2 h-10 w-full rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductCarousel({
  products,
  isLoading = false,
  count = 4,
  ariaLabel = 'Products',
}: {
  products: (Product | WishlistProduct)[] | undefined;
  isLoading?: boolean;
  count?: number;
  ariaLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateNav = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateNav();
    el.addEventListener('scroll', updateNav, { passive: true });
    window.addEventListener('resize', updateNav);
    return () => {
      el.removeEventListener('scroll', updateNav);
      window.removeEventListener('resize', updateNav);
    };
  }, [updateNav, products?.length, isLoading]);

  const page = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  // ---- Mouse drag-to-scroll (mouse only; touch/trackpad use native scrolling) ----
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = trackRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const el = trackRef.current;
    if (!el) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - dx;
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    trackRef.current?.classList.remove('is-dragging');
    trackRef.current?.releasePointerCapture?.(e.pointerId);
  };
  // Suppress the click that follows a real drag so a card link/button doesn't fire.
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      page(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      page(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (e.key === 'End') {
      e.preventDefault();
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    }
  };

  if (isLoading) return <CarouselSkeleton count={count} />;

  const items = products ?? [];
  if (items.length === 0) return null;

  return (
    <div className="v-carousel-wrap">
      <button
        type="button"
        className="v-carousel-nav v-carousel-prev"
        onClick={() => page(-1)}
        disabled={!canPrev}
        aria-label="Previous products"
      >
        <ChevronLeft />
      </button>

      <div
        ref={trackRef}
        className="v-carousel"
        role="group"
        aria-label={ariaLabel}
        aria-roledescription="carousel"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        onKeyDown={onKeyDown}
      >
        {items.map((p) => (
          <div key={p.id} className="v-carousel-slide">
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="v-carousel-nav v-carousel-next"
        onClick={() => page(1)}
        disabled={!canNext}
        aria-label="Next products"
      >
        <ChevronRight />
      </button>
    </div>
  );
}
