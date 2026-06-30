'use client';

import Link from 'next/link';
import { useCategories } from '@/lib/hooks/useProducts';
import { SectionHeader } from '@/components/store/SectionHeader';

/* ----------------------------------------------------------------------------
 * Verdant "Shop by category" — a 1:1 port of the HTML reference. Tall 3:4 cards
 * with a soft per-category radial gradient, a large faded serif initial bottom-
 * right, and the name + blurb bottom-left. Styling is inline (static) + `v-cat-*`
 * classes in globals.css (hover/focus/responsive), all keyed off the reference
 * design variables.
 *
 * The cards are driven by REAL backend categories (useCategories) — names and
 * routing are dynamic. The gradient tone + one-line blurb are presentational
 * (the API has no such field): a name-keyed map supplies them, with a graceful
 * fallback (palette cycled by index, generic blurb) for any unknown category.
 * -------------------------------------------------------------------------- */

/** Warm pastel tones, mirrored from the reference palette. */
const PALETTE = ['#3F7D5B', '#B98A5E', '#C99A3E', '#9E8C6A', '#6F8A82'];

/** Per-category gradient tone + blurb. Keyed by lowercased category name. */
const META: Record<string, { tone: string; blurb: string }> = {
  // Reference categories (exact tones + blurbs).
  plants: { tone: '#3F7D5B', blurb: 'Living greenery, delivered' },
  ceramics: { tone: '#B98A5E', blurb: 'Hand-thrown stoneware' },
  fragrance: { tone: '#C99A3E', blurb: 'Candles & incense' },
  textiles: { tone: '#9E8C6A', blurb: 'Linen & wool, woven slow' },
  objects: { tone: '#6F8A82', blurb: 'Tools & quiet decor' },
  // Live seed categories — one tone each, drawn from the same pastel palette.
  electronics: { tone: '#6F8A82', blurb: 'Considered tech & tools' },
  apparel: { tone: '#9E8C6A', blurb: 'Slow-made everyday wear' },
  home: { tone: '#B98A5E', blurb: 'Calm for every room' },
  outdoors: { tone: '#3F7D5B', blurb: 'For the open air' },
  books: { tone: '#C99A3E', blurb: 'Words worth keeping' },
};

/** The reference card gradient — `tone` blended into the surface tones. */
function art(tone: string): string {
  return `radial-gradient(120% 120% at 35% 25%, color-mix(in oklab, ${tone} 32%, var(--surface)) 0%, var(--surface2) 56%, color-mix(in oklab, ${tone} 12%, var(--surface2)) 100%)`;
}

function metaFor(name: string, index: number): { tone: string; blurb: string } {
  return META[name.toLowerCase()] ?? { tone: PALETTE[index % PALETTE.length], blurb: 'Explore the collection' };
}

export function CategoryGrid() {
  const { data: categories = [], isLoading } = useCategories();

  // Nothing to show and not loading → render no section at all.
  if (!isLoading && categories.length === 0) return null;

  return (
    <section className="v-cat-section">
      <SectionHeader eyebrow="Browse" title="Shop by category" viewAllHref="/products" />

      {/* Cards */}
      <div className="v-cat-grid">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="pp-skeleton"
                aria-hidden="true"
                style={{ aspectRatio: '3 / 4', borderRadius: 20, border: '1px solid var(--line)' }}
              />
            ))
          : categories.map((cat, i) => {
              const { tone, blurb } = metaFor(cat, i);
              const initial = cat.charAt(0).toUpperCase();
              return (
                <Link
                  key={cat}
                  href={`/products?category=${encodeURIComponent(cat)}`}
                  className="v-cat-card"
                  style={{ background: art(tone) }}
                >
                  {/* Large faded decorative initial, bottom-right */}
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      right: 8,
                      bottom: -6,
                      fontFamily: "'Newsreader',serif",
                      fontSize: 130,
                      lineHeight: 1,
                      color: 'var(--ink)',
                      opacity: 0.08,
                    }}
                  >
                    {initial}
                  </span>
                  {/* Name + blurb, bottom-left */}
                  <span style={{ position: 'absolute', left: 18, right: 18, bottom: 18 }}>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: "'Newsreader',serif",
                        fontSize: 22,
                        color: 'var(--ink)',
                      }}
                    >
                      {cat}
                    </span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                      {blurb}
                    </span>
                  </span>
                </Link>
              );
            })}
      </div>
    </section>
  );
}
