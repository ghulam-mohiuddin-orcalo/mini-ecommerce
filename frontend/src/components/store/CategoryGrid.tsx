'use client';

import Link from 'next/link';
import { useCategories } from '@/lib/hooks/useProducts';
import { categoryPresentation } from '@/lib/categoryPresentation';
import { SectionHeader } from '@/components/store/SectionHeader';

/* ----------------------------------------------------------------------------
 * Verdant "Shop by category" — tall 3:4 cards. Each card is driven entirely by the
 * DB category (name, description, imageUrl). Presentation fallbacks (gradient tone +
 * generic blurb when there's no imageUrl/description) come from
 * `lib/categoryPresentation.ts`. Cards link to /products?category=<slug>.
 * -------------------------------------------------------------------------- */

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
              const { imageUrl, gradient, blurb, initial } = categoryPresentation(cat, i);
              return (
                <Link
                  key={cat.id}
                  href={`/products?category=${encodeURIComponent(cat.slug)}`}
                  className="v-cat-card"
                  style={{
                    background: imageUrl
                      ? `linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%), url(${imageUrl}) center/cover no-repeat`
                      : gradient,
                  }}
                >
                  {/* Large faded decorative initial, bottom-right — only over the gradient art. */}
                  {!imageUrl && (
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
                  )}
                  {/* Name + blurb, bottom-left */}
                  <span style={{ position: 'absolute', left: 18, right: 18, bottom: 18 }}>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: "'Newsreader',serif",
                        fontSize: 22,
                        color: imageUrl ? '#fff' : 'var(--ink)',
                      }}
                    >
                      {cat.name}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 12.5,
                        color: imageUrl ? 'rgba(255,255,255,0.82)' : 'var(--muted)',
                        marginTop: 2,
                      }}
                    >
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
