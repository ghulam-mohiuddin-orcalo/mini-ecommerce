'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import type { ProductImage } from '@/lib/types';

/**
 * PDP image gallery — a large active image plus a clickable thumbnail strip. Falls back to the
 * product's single imageUrl when the images array is empty. Alt text comes from each image.
 */
export function ProductGallery({
  images,
  fallbackUrl,
  productName,
}: {
  images: ProductImage[];
  fallbackUrl: string;
  productName: string;
}) {
  const gallery: ProductImage[] =
    images.length > 0 ? images : [{ url: fallbackUrl, alt: productName }];
  const [active, setActive] = useState(0);
  const current = gallery[Math.min(active, gallery.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-brand-50 to-brand-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.alt ?? productName}
          className="aspect-square w-full object-cover"
        />
      </div>

      {gallery.length > 1 && (
        <ul className="flex flex-wrap gap-2.5" aria-label="Product images">
          {gallery.map((img, i) => {
            const selected = i === active;
            return (
              <li key={`${img.url}-${i}`}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`View image ${i + 1}${img.alt ? `: ${img.alt}` : ''}`}
                  aria-pressed={selected}
                  className={cn(
                    'overflow-hidden rounded-md border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                    selected ? 'border-brand-600' : 'border-line hover:border-faint',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    loading="lazy"
                    className="h-16 w-16 object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
