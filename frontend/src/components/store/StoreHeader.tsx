'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useMe, useLogout } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { useCategories } from '@/lib/hooks/useProducts';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Drawer } from '@/components/ui/Drawer';
import { Dropdown } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';
import { Marquee } from '@/components/ui/Marquee';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { UserMenu } from './UserMenu';
import { useCartDrawer } from './CartDrawer';

const ANNOUNCEMENTS: { icon: IconName; text: string }[] = [
  { icon: 'truck', text: 'Free shipping on orders over $50' },
  { icon: 'rotate-ccw', text: 'Free 30-day returns' },
  { icon: 'leaf', text: 'Thoughtfully made, responsibly sourced' },
  { icon: 'shield-check', text: 'Secure checkout' },
];

const PRIMARY_NAV: { label: string; href: string; match: 'exact' | 'prefix' }[] = [
  { label: 'Home', href: '/', match: 'exact' },
  { label: 'Journal', href: '/journal', match: 'prefix' },
  { label: 'About', href: '/about', match: 'prefix' },
  { label: 'Contact', href: '/contact', match: 'prefix' },
];

function isActivePath(pathname: string, href: string, match: 'exact' | 'prefix'): boolean {
  return match === 'exact' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/* ----------------------------------------------------------------------------
 * Announcement bar — concise, real messaging (no fake promo codes).
 * -------------------------------------------------------------------------- */
function AnnouncementBar() {
  return (
    <div className="bg-brand-700 text-paper dark:bg-brand-900">
      <Marquee speed={36} className="py-2">
        <span className="flex items-center">
          {ANNOUNCEMENTS.map((a) => (
            <span key={a.text} className="mx-6 inline-flex items-center gap-2 text-xs font-semibold tracking-wide">
              <Icon name={a.icon} size={14} aria-hidden="true" />
              {a.text}
            </span>
          ))}
        </span>
      </Marquee>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Brand mark + wordmark.
 * -------------------------------------------------------------------------- */
function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="group flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-brand-600 text-[15px] font-extrabold text-white shadow-[var(--shadow-btn)] transition-transform group-hover:-translate-y-0.5">
        P
      </span>
      <span className="font-serif text-[19px] font-semibold tracking-tight text-ink">Pine &amp; Parcel</span>
    </Link>
  );
}

/* ----------------------------------------------------------------------------
 * Shop mega-menu — real categories from useCategories, each → /products?category=…
 * Uses the free-form Dropdown panel (menu={false}).
 * -------------------------------------------------------------------------- */
function ShopMegaMenu({ active }: { active: boolean }) {
  const { data: categories, isLoading } = useCategories();

  const trigger = (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
        active ? 'text-ink' : 'text-ink-soft hover:bg-paper-2 hover:text-ink',
      )}
    >
      Shop
      <Icon name="chevron-down" size={14} className="text-muted" />
    </button>
  );

  return (
    <Dropdown trigger={trigger} align="start" menu={false} className="w-[min(92vw,30rem)] p-4">
      <div className="flex items-center justify-between px-1 pb-3">
        <p className="text-xs font-bold uppercase tracking-[0.07em] text-muted">Shop by category</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-300"
        >
          View all
          <Icon name="arrow-right" size={13} />
        </Link>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="pp-skeleton h-10 rounded-lg" aria-hidden="true" />
          ))}
        </div>
      ) : !categories || categories.length === 0 ? (
        <Link
          href="/products"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-paper-2 hover:text-ink"
        >
          <Icon name="package" size={16} className="text-muted" />
          Browse all products
        </Link>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {categories.map((category) => (
            <Link
              key={category}
              href={`/products?category=${encodeURIComponent(category)}`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold capitalize text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700 dark:hover:text-brand-300"
            >
              <Icon name="tag" size={15} className="text-muted" />
              {category}
            </Link>
          ))}
        </div>
      )}
    </Dropdown>
  );
}

/* ----------------------------------------------------------------------------
 * Search overlay — native form, Enter to search → /products?search=…
 * -------------------------------------------------------------------------- */
function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [term, setTerm] = useState('');

  useEffect(() => {
    if (!open) setTerm('');
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    onClose();
    router.push(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
  };

  return (
    <Modal open={open} onClose={onClose} title="Search products" className="max-w-xl">
      <form onSubmit={submit} role="search" className="flex flex-col gap-3">
        <div className="relative">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          {/* autoFocus is appropriate here: the overlay exists solely to capture a query. */}
          <Input
            autoFocus
            type="search"
            name="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search for products, categories…"
            aria-label="Search products"
            className="pl-11"
          />
        </div>
        <Button type="submit" className="self-end">
          <Icon name="search" size={15} />
          Search
        </Button>
      </form>
    </Modal>
  );
}

/* ----------------------------------------------------------------------------
 * Mobile navigation drawer (left) — nav links + categories.
 * -------------------------------------------------------------------------- */
function MobileNav({
  open,
  onClose,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
}) {
  const { data: categories } = useCategories();
  const linkClass = (href: string, match: 'exact' | 'prefix') =>
    cn(
      'rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-colors',
      isActivePath(pathname, href, match)
        ? 'bg-brand-50 text-brand-700 dark:text-brand-300'
        : 'text-ink-soft hover:bg-paper-2 hover:text-ink',
    );

  return (
    <Drawer open={open} onClose={onClose} side="left" title="Menu">
      <nav className="flex flex-col gap-1 p-4" aria-label="Mobile">
        <Link href="/" onClick={onClose} className={linkClass('/', 'exact')}>
          Home
        </Link>
        <Link href="/products" onClick={onClose} className={linkClass('/products', 'prefix')}>
          Shop all
        </Link>
        {PRIMARY_NAV.filter((n) => n.href !== '/').map((n) => (
          <Link key={n.href} href={n.href} onClick={onClose} className={linkClass(n.href, n.match)}>
            {n.label}
          </Link>
        ))}
      </nav>

      {categories && categories.length > 0 && (
        <div className="border-t border-line-soft p-4">
          <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.07em] text-muted">Categories</p>
          <div className="flex flex-col gap-1">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/products?category=${encodeURIComponent(category)}`}
                onClick={onClose}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold capitalize text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
              >
                <Icon name="tag" size={15} className="text-muted" />
                {category}
              </Link>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  );
}

/* ----------------------------------------------------------------------------
 * Header.
 * -------------------------------------------------------------------------- */
export function StoreHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useMe();
  const signedIn = Boolean(user);
  const { data: cart } = useCart(signedIn);
  const { data: wishlist } = useWishlist(signedIn);
  const logout = useLogout();
  const cartDrawer = useCartDrawer();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const cartCount = cart?.itemCount ?? 0;
  const wishlistCount = wishlist?.itemCount ?? 0;
  const shopActive = pathname.startsWith('/products');

  // Close transient menus on navigation.
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const navLinkClass = (href: string, match: 'exact' | 'prefix') =>
    cn(
      'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
      isActivePath(pathname, href, match) ? 'text-ink' : 'text-ink-soft hover:bg-paper-2 hover:text-ink',
    );

  const iconBtn =
    'relative grid h-10 w-10 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

  const countBadge =
    'absolute -right-0.5 -top-0.5 inline-grid min-w-[18px] place-items-center rounded-full bg-brand-600 px-1 py-0.5 text-[10px] font-bold leading-none text-white';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <AnnouncementBar />

      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className={cn(iconBtn, 'lg:hidden')}
        >
          <Icon name="menu" size={20} />
        </button>

        <Brand />

        {/* Primary nav (desktop) */}
        <nav className="ml-4 hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          <Link href="/" className={navLinkClass('/', 'exact')}>
            Home
          </Link>
          <ShopMegaMenu active={shopActive} />
          {PRIMARY_NAV.filter((n) => n.href !== '/').map((n) => (
            <Link key={n.href} href={n.href} className={navLinkClass(n.href, n.match)}>
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search products"
            className={iconBtn}
          >
            <Icon name="search" size={19} />
          </button>

          {signedIn && (
            <Link href="/wishlist" aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} item${wishlistCount === 1 ? '' : 's'}` : ''}`} className={iconBtn}>
              <Icon name="heart" size={19} />
              {wishlistCount > 0 && <span className={countBadge}>{wishlistCount}</span>}
            </Link>
          )}

          <button
            type="button"
            onClick={cartDrawer.open}
            aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} item${cartCount === 1 ? '' : 's'}` : ''}`}
            aria-haspopup="dialog"
            className={iconBtn}
          >
            <Icon name="cart" size={19} />
            {cartCount > 0 && <span className={countBadge}>{cartCount}</span>}
          </button>

          <ThemeToggle className="hidden sm:inline-flex" />

          {signedIn && user ? (
            <div className="pl-1">
              <UserMenu
                user={user}
                cartCount={cartCount}
                signingOut={logout.isPending}
                onSignOut={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
              />
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-1 inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} pathname={pathname} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
