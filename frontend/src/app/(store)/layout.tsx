import Link from 'next/link';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreAccessGuard } from '@/components/store/StoreAccessGuard';

const FOOTER_GROUPS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Shop',
    links: [
      { label: 'All products', href: '/products' },
      { label: 'New arrivals', href: '/#new-arrivals' },
      { label: 'Your orders', href: '/orders' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Help',
    links: [
      { label: 'FAQ', href: '/faq' },
      { label: 'Returns', href: '/faq' },
    ],
  },
];

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreAccessGuard>
      <div className="flex min-h-screen flex-col">
        <StoreHeader />
        <main className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-line bg-paper-2">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-1">
                <Link href="/" className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-brand-600 text-[15px] font-extrabold text-white">
                    P
                  </span>
                  <span className="font-serif text-[18px] font-semibold tracking-tight text-ink">
                    Pine &amp; Parcel
                  </span>
                </Link>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
                  A small, coherent storefront of thoughtfully made goods.
                </p>
              </div>
              {FOOTER_GROUPS.map((group) => (
                <nav key={group.heading} aria-label={group.heading}>
                  <h2 className="text-xs font-bold uppercase tracking-[0.07em] text-muted">
                    {group.heading}
                  </h2>
                  <ul className="mt-3 flex flex-col gap-2 text-sm">
                    {group.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="font-semibold text-ink-soft transition-colors hover:text-ink"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm">
              <p className="text-muted">© {new Date().getFullYear()} Pine &amp; Parcel — a mini e-commerce demo.</p>
              <p className="font-semibold text-brand-600 dark:text-brand-300">Thoughtfully made goods</p>
            </div>
          </div>
        </footer>
      </div>
    </StoreAccessGuard>
  );
}
