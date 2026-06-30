'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/lib/types';

/* ----------------------------------------------------------------------------
 * Verdant "Flash sale" band — a 1:1 port of the HTML reference. A single rounded
 * dark-teal container (forest→primary gradient) with a soft gold glow, split into
 * a two-column grid: left holds the badge / serif heading / blurb / countdown /
 * CTA; right holds two featured on-sale product cards (beige gradient image area
 * with a large faded serif initial + a rose discount pill).
 *
 * Styling follows the established port pattern: inline styles using the reference
 * design variables for static props, with `v-sale-*` classes in globals.css for
 * :hover/:focus-visible and the responsive collapse (which inline styles can't
 * express). Cards are driven by REAL on-sale products (passed in); only the
 * presentational beige tone of the image area is fixed, mirroring the reference.
 * -------------------------------------------------------------------------- */

/** The reference beige tone for the sale-card image area (textile #9E8C6A). */
const SALE_TONE = '#9E8C6A';

/** The reference product-image gradient — `tone` blended into the surface tones. */
const saleArt = `radial-gradient(120% 130% at 28% 18%, color-mix(in oklab, ${SALE_TONE} 32%, var(--surface)) 0%, var(--surface2) 56%, color-mix(in oklab, ${SALE_TONE} 12%, var(--surface2)) 100%)`;

const ArrowRight = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/* ---- Countdown (reference port): three boxes — HRS / MIN / SEC. The deadline is
 *      end-of-today so days are always 0; a self-cleaning 1s interval ticks it. -- */
const pad = (n: number) => String(n).padStart(2, '0');

interface HMS {
  h: number;
  m: number;
  s: number;
}

function remaining(targetMs: number): HMS {
  const ms = Math.max(0, targetMs - Date.now());
  return {
    h: Math.floor(ms / 3_600_000),
    m: Math.floor((ms / 60_000) % 60),
    s: Math.floor((ms / 1000) % 60),
  };
}

const boxStyle: CSSProperties = {
  textAlign: 'center',
  background: 'rgba(255,255,255,.1)',
  border: '1px solid rgba(255,255,255,.16)',
  borderRadius: 14,
  padding: '12px 0',
  width: 74,
};
const numStyle: CSSProperties = { fontFamily: "'Newsreader',serif", fontSize: 34, lineHeight: 1 };
const unitStyle: CSSProperties = {
  fontSize: 10.5,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  opacity: 0.7,
  marginTop: 5,
};

function SaleCountdown({ target }: { target: Date }) {
  const targetMs = target.getTime();
  const [t, setT] = useState<HMS>(() => remaining(targetMs));

  useEffect(() => {
    setT(remaining(targetMs));
    const id = setInterval(() => setT(remaining(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const units: { label: string; value: number }[] = [
    { label: 'Hrs', value: t.h },
    { label: 'Min', value: t.m },
    { label: 'Sec', value: t.s },
  ];

  return (
    <div
      role="timer"
      aria-label={`${t.h} hours, ${t.m} minutes, ${t.s} seconds remaining`}
      style={{ display: 'flex', gap: 12, marginBottom: 28 }}
    >
      {units.map((u) => (
        <div key={u.label} style={boxStyle}>
          <div style={numStyle}>{pad(u.value)}</div>
          <div style={unitStyle}>{u.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ---- One sale product card: beige gradient image area + faded serif initial,
 *      rose discount pill, name, and price (sale + struck-through compare-at). -- */
function SaleCard({ product }: { product: Product }) {
  const initial = product.name.charAt(0).toUpperCase();
  const compareAt = product.compareAtPriceCents;
  const hasWas = compareAt != null && compareAt > product.priceCents;
  const off = hasWas ? `-${Math.round((1 - product.priceCents / compareAt) * 100)}%` : null;

  return (
    <Link href={`/products/${product.id}`} className="v-sale-prod" aria-label={`${product.name} — on sale`}>
      <div
        style={{
          position: 'relative',
          aspectRatio: '1',
          borderRadius: 12,
          background: saleArt,
          marginBottom: 12,
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <span aria-hidden="true" style={{ fontFamily: "'Newsreader',serif", fontSize: 64, color: 'var(--ink)', opacity: 0.1 }}>
          {initial}
        </span>
        {off && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              fontSize: 11,
              fontWeight: 800,
              background: 'var(--rose)',
              color: '#fff',
              padding: '3px 9px',
              borderRadius: 20,
            }}
          >
            {off}
          </span>
        )}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{product.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 15 }}>
          {formatPrice(product.priceCents)}
        </span>
        {hasWas && (
          <span style={{ color: 'var(--faint)', textDecoration: 'line-through', fontSize: 13 }}>
            {formatPrice(compareAt)}
          </span>
        )}
      </div>
    </Link>
  );
}

/** Skeleton placeholder mirroring a sale card's footprint while products load. */
function SaleCardSkeleton() {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 18, padding: 14 }}>
      <div className="pp-skeleton" style={{ aspectRatio: '1', borderRadius: 12, marginBottom: 12 }} />
      <div className="pp-skeleton" style={{ height: 14, width: '70%', borderRadius: 6 }} />
      <div className="pp-skeleton" style={{ height: 13, width: '45%', borderRadius: 6, marginTop: 8 }} />
    </div>
  );
}

export interface FlashSaleProps {
  /** Real on-sale products; the first two are featured. */
  products: Product[];
  /** Show skeleton cards while the product fetch is in flight. */
  isLoading?: boolean;
  /** Absolute deadline the countdown ticks down to. */
  deadline: Date;
}

export function FlashSale({ products, isLoading = false, deadline }: FlashSaleProps) {
  const featured = products.slice(0, 2);

  return (
    <section className="v-sale-section" aria-label="Flash sale">
      <div className="v-sale-card">
        {/* soft gold glow, top-left */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -60,
            left: -30,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(212,160,23,.32),transparent 70%)',
          }}
        />

        {/* left — promo content */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              background: 'rgba(255,255,255,.12)',
              border: '1px solid rgba(255,255,255,.2)',
              padding: '6px 12px',
              borderRadius: 20,
              marginBottom: 18,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--gold-soft)',
                boxShadow: '0 0 8px var(--gold-soft)',
              }}
            />
            Flash sale
          </div>

          <h2
            style={{
              fontFamily: "'Newsreader',serif",
              fontWeight: 400,
              fontSize: 'clamp(30px,3.6vw,46px)',
              lineHeight: 1.05,
              margin: '0 0 14px',
            }}
          >
            Up to 25% off,
            <br />
            for a little while.
          </h2>

          <p style={{ fontSize: 15.5, lineHeight: 1.6, opacity: 0.85, maxWidth: 360, margin: '0 0 24px' }}>
            A small selection of seasonal favourites, gently marked down. When they&apos;re gone,
            they&apos;re gone.
          </p>

          <SaleCountdown target={deadline} />

          <Link href="/products" className="v-sale-cta">
            Shop the sale
            <ArrowRight />
          </Link>
        </div>

        {/* right — featured sale cards */}
        <div className="v-sale-products">
          {isLoading
            ? Array.from({ length: 2 }).map((_, i) => <SaleCardSkeleton key={i} />)
            : featured.map((p) => <SaleCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}
