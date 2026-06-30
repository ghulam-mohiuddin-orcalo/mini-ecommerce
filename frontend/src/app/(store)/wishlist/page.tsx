import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Wishlist — Pine & Parcel',
  description: 'Save products to come back to later.',
};

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="pp-rise flex flex-col items-center rounded-2xl border border-line bg-surface p-10 text-center shadow-[var(--shadow-card)] sm:p-14">
        <span
          className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:text-brand-300"
          aria-hidden="true"
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
          </svg>
        </span>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-paper-2 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-faint">
          Coming soon
        </span>
        <h1 className="mt-4 font-serif text-3xl font-medium tracking-tight text-ink">Your wishlist</h1>
        <p className="mt-3 max-w-md text-ink-soft">
          Soon you&rsquo;ll be able to save products you love and find them here later. We&rsquo;re still
          building this — for now, browse the catalog and add favourites to your cart.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/products">
            <Button>
              Browse the catalog
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">Back home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
