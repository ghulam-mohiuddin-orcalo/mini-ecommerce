'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/store/ProductCard';
import { useProduct } from '@/lib/hooks/useProducts';

const STORAGE_KEY = 'pp:recently-viewed';
const MAX = 8;

function readIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Record a product view in localStorage (most-recent first). This is view history — not the
 * wishlist (which is server-owned) — so localStorage is the right, allowed home for it.
 */
export function recordRecentlyViewed(productId: string) {
  if (typeof window === 'undefined') return;
  try {
    const ids = [productId, ...readIds().filter((id) => id !== productId)].slice(0, MAX);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // storage unavailable (private mode / quota) — silently skip; the rail just won't populate.
  }
}

/** Fetches one product by id; renders its card, or nothing if it failed/was removed. */
function RecentCard({ id }: { id: string }) {
  const { data } = useProduct(id);
  if (!data) return null;
  return <ProductCard product={data} />;
}

/**
 * "Recently viewed" rail. Reads the localStorage history (excluding the current product),
 * resolving each id through the product cache. Renders nothing when there's no history.
 */
export function RecentlyViewed({ excludeId }: { excludeId: string }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(readIds().filter((id) => id !== excludeId).slice(0, 4));
  }, [excludeId]);

  if (ids.length === 0) return null;

  return (
    <section>
      <h2 className="mb-6 font-serif text-[26px] font-medium tracking-tight text-ink sm:text-3xl">
        Recently viewed
      </h2>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {ids.map((id) => (
          <RecentCard key={id} id={id} />
        ))}
      </div>
    </section>
  );
}
