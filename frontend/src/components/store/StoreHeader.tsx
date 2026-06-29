import Link from 'next/link';

/** Storefront top navigation. Cart & account land in later milestones. */
export function StoreHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            P
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink">Pine &amp; Parcel</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/products"
            className="rounded-lg px-3 py-2 font-medium text-ink transition-colors hover:bg-brand-50"
          >
            Shop
          </Link>
        </nav>
      </div>
    </header>
  );
}
