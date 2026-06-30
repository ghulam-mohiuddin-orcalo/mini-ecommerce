'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useMe, useLogout } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { useCategories } from '@/lib/hooks/useProducts';
import { usePreferences } from '@/lib/hooks/usePreferences';
import { Drawer } from '@/components/ui/Drawer';
import { UserMenu } from './UserMenu';
import { useCartDrawer } from './CartDrawer';

/* ----------------------------------------------------------------------------
 * Verdant Top Bar + Header — a 1:1 port of the HTML reference. Styling lives as
 * inline styles (static) + `v-*` classes in globals.css (hover/transition), all
 * keyed off the reference's design variables (--bg/--ink/--primary/…). Real data
 * is wired in: auth state, cart/wishlist counts, live categories, search routing.
 * The reference is a fixed-width desktop mock; below `lg` the nav collapses to a
 * drawer so the storefront stays usable on small screens.
 * -------------------------------------------------------------------------- */

type NavItem = { label: string; href: string; match: 'exact' | 'prefix'; mega?: boolean };

const PRIMARY_NAV: NavItem[] = [
  { label: 'Home', href: '/', match: 'exact' },
  { label: 'Shop', href: '/products', match: 'prefix', mega: true },
  { label: 'Collections', href: '/products', match: 'prefix' },
  { label: 'Journal', href: '/journal', match: 'prefix' },
  { label: 'About', href: '/about', match: 'prefix' },
];

/** Category accent tones, mirroring the reference palette (cycled by index). */
const CATEGORY_TONES = ['#3F7D5B', '#B98A5E', '#C99A3E', '#6F8A82', '#9E8C6A'];
const categoryArt = (tone: string) =>
  `radial-gradient(120% 130% at 28% 18%, color-mix(in oklab, ${tone} 32%, var(--surface)) 0%, var(--surface2) 56%, color-mix(in oklab, ${tone} 12%, var(--surface2)) 100%)`;

function isActivePath(pathname: string, href: string, match: 'exact' | 'prefix'): boolean {
  return match === 'exact' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

const LeafLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6" />
  </svg>
);

const SearchIcon = ({ size = 19 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

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
  const { data: categories } = useCategories();
  const logout = useLogout();
  const cartDrawer = useCartDrawer();
  const { resolvedTheme, setTheme } = usePreferences();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [term, setTerm] = useState('');
  const headerRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const cartCount = cart?.itemCount ?? 0;
  const wishlistCount = wishlist?.itemCount ?? 0;
  const isDark = resolvedTheme === 'dark';
  const countFmt = (n: number) => (n > 99 ? '99+' : String(n));

  // Sticky shadow once the page has scrolled (reference threshold: 14px).
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close transient surfaces on navigation.
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  // Search panel: focus on open; ESC + outside-click close.
  useEffect(() => {
    if (!searchOpen) {
      setTerm('');
      return;
    }
    searchInputRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSearchOpen(false);
    }
    function onPointerDown(e: PointerEvent) {
      if (!headerRef.current?.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [searchOpen]);

  const openSearch = useCallback(() => {
    setMegaOpen(false);
    setSearchOpen(true);
  }, []);

  const openMega = useCallback(() => {
    setSearchOpen(false);
    setMegaOpen(true);
  }, []);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    setSearchOpen(false);
    router.push(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
  };

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const megaCategories = categories ?? [];

  return (
    <div className="sticky top-0 z-40">
      {/* announcement */}
      <div
        style={{
          background: 'var(--forest)',
          color: '#EAF3EF',
          textAlign: 'center',
          fontSize: 12.5,
          letterSpacing: '0.06em',
          fontWeight: 600,
          padding: '9px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          textTransform: 'uppercase',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--gold-soft)',
            boxShadow: '0 0 10px var(--gold-soft)',
            display: 'inline-block',
          }}
        />
        Complimentary carbon-neutral shipping over $75 · 30-day returns
      </div>

      {/* header */}
      <header
        ref={headerRef}
        onMouseLeave={() => setMegaOpen(false)}
        style={{
          position: 'relative',
          backdropFilter: 'saturate(160%) blur(18px)',
          WebkitBackdropFilter: 'saturate(160%) blur(18px)',
          background: scrolled ? 'var(--glass2)' : 'var(--glass)',
          borderBottom: '1px solid var(--line)',
          transition: 'box-shadow .35s,background .35s',
          boxShadow: scrolled ? '0 10px 30px -18px var(--shadow2)' : '0 1px 0 var(--line)',
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: '0 auto',
            padding: '0 28px',
            height: 74,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
          }}
        >
          {/* mobile menu toggle */}
          <div className="lg:hidden">
            <button type="button" className="v-icon-btn" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </div>

          {/* logo */}
          <Link href="/" aria-label="Verdant home" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: 'linear-gradient(150deg,var(--primary),var(--forest))',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 6px 16px -8px var(--primary)',
              }}
            >
              <LeafLogo />
            </span>
            <span style={{ fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 25, letterSpacing: '-0.01em', lineHeight: 1, color: 'var(--ink)' }}>
              Verdant
            </span>
          </Link>

          {/* nav (desktop) */}
          <nav className="hidden lg:flex" style={{ alignItems: 'center', gap: 4 }} aria-label="Primary">
            {PRIMARY_NAV.map((item) =>
              item.mega ? (
                <div key={item.label} style={{ position: 'relative' }} onMouseEnter={openMega}>
                  <button
                    type="button"
                    className="v-nav-btn"
                    data-active={isActivePath(pathname, item.href, item.match)}
                    onClick={() => router.push(item.href)}
                  >
                    {item.label}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  className="v-nav-btn"
                  data-active={isActivePath(pathname, item.href, item.match)}
                  onClick={() => router.push(item.href)}
                  onMouseEnter={() => setMegaOpen(false)}
                >
                  {item.label}
                </button>
              ),
            )}
          </nav>

          {/* actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button type="button" className="v-icon-btn" aria-label="Search" onClick={openSearch}>
              <SearchIcon />
            </button>

            <button type="button" className="v-icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>
              {isDark ? (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              className="v-icon-btn"
              aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} item${wishlistCount === 1 ? '' : 's'}` : ''}`}
              onClick={() => router.push('/wishlist')}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.5-1.5 3-3.3 3-5.5A4.5 4.5 0 0 0 12 5 4.5 4.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7Z" />
              </svg>
              {signedIn && wishlistCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    minWidth: 17,
                    height: 17,
                    padding: '0 4px',
                    borderRadius: 9,
                    background: 'var(--gold-soft)',
                    color: '#1a1206',
                    fontSize: 10.5,
                    fontWeight: 800,
                    display: 'grid',
                    placeItems: 'center',
                    border: '2px solid var(--glass)',
                  }}
                >
                  {countFmt(wishlistCount)}
                </span>
              )}
            </button>

            <button
              type="button"
              className="v-icon-btn"
              aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} item${cartCount === 1 ? '' : 's'}` : ''}`}
              aria-haspopup="dialog"
              onClick={cartDrawer.open}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {cartCount > 0 && (
                <span
                  className="v-pop"
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    minWidth: 18,
                    height: 18,
                    padding: '0 4px',
                    borderRadius: 9,
                    background: 'var(--primary)',
                    color: 'var(--on-primary)',
                    fontSize: 10.5,
                    fontWeight: 800,
                    display: 'grid',
                    placeItems: 'center',
                    border: '2px solid var(--glass)',
                  }}
                >
                  {countFmt(cartCount)}
                </span>
              )}
            </button>

            <div style={{ width: 1, height: 26, background: 'var(--line2)', margin: '0 6px' }} />

            {signedIn && user ? (
              <UserMenu
                user={user}
                wishlistCount={wishlistCount}
                cartCount={cartCount}
                signingOut={logout.isPending}
                onSignOut={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
              />
            ) : (
              <Link href="/login" className="v-signin" style={{ textDecoration: 'none' }}>
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* mega menu */}
        {megaOpen && (
          <div
            className="v-panel"
            onMouseLeave={() => setMegaOpen(false)}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--surface)',
              borderTop: '1px solid var(--line)',
              borderBottom: '1px solid var(--line)',
              boxShadow: '0 30px 60px -28px var(--shadow2)',
            }}
          >
            <div
              style={{
                maxWidth: 1320,
                margin: '0 auto',
                padding: '30px 28px',
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr',
                gap: 36,
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 16 }}>
                  Shop by category
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {megaCategories.length === 0 ? (
                    <Link href="/products" className="v-mega-cat" style={{ textDecoration: 'none' }}>
                      <span
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 12,
                          background: categoryArt(CATEGORY_TONES[0]),
                          display: 'grid',
                          placeItems: 'center',
                          fontFamily: "'Newsreader',serif",
                          fontSize: 20,
                          color: 'var(--ink-soft)',
                          border: '1px solid var(--line)',
                          flexShrink: 0,
                        }}
                      >
                        V
                      </span>
                      <span>
                        <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>All products</span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>Browse everything</span>
                      </span>
                    </Link>
                  ) : (
                    megaCategories.map((category, i) => (
                      <Link
                        key={category}
                        href={`/products?category=${encodeURIComponent(category)}`}
                        className="v-mega-cat"
                        style={{ textDecoration: 'none' }}
                      >
                        <span
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 12,
                            background: categoryArt(CATEGORY_TONES[i % CATEGORY_TONES.length]),
                            display: 'grid',
                            placeItems: 'center',
                            fontFamily: "'Newsreader',serif",
                            fontSize: 20,
                            color: 'var(--ink-soft)',
                            border: '1px solid var(--line)',
                            flexShrink: 0,
                          }}
                        >
                          {category.charAt(0).toUpperCase()}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--ink)', textTransform: 'capitalize' }}>
                            {category}
                          </span>
                          <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>Shop now</span>
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
              <Link href="/products" className="v-winter" style={{ textDecoration: 'none' }}>
                <span
                  style={{
                    position: 'absolute',
                    top: -30,
                    right: -30,
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle,rgba(212,160,23,.4),transparent 70%)',
                  }}
                />
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.8 }}>
                  The Winter Edit
                </span>
                <span style={{ fontFamily: "'Newsreader',serif", fontSize: 27, lineHeight: 1.1, margin: '8px 0 12px', maxWidth: 240 }}>
                  Warmth, gathered for the season
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 14 }}>
                  Explore the edit
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        )}

        {/* search overlay */}
        {searchOpen && (
          <div
            className="v-panel"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--surface)',
              borderBottom: '1px solid var(--line)',
              boxShadow: '0 30px 60px -28px var(--shadow2)',
            }}
          >
            <form onSubmit={submitSearch} role="search" style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 28px 30px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  border: '1px solid var(--line2)',
                  background: 'var(--surface2)',
                  borderRadius: 16,
                  padding: '0 18px',
                  height: 60,
                }}
              >
                <span style={{ color: 'var(--muted)', display: 'grid', placeItems: 'center' }}>
                  <SearchIcon size={22} />
                </span>
                <input
                  ref={searchInputRef}
                  type="search"
                  name="search"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search plants, ceramics, candles…"
                  aria-label="Search products"
                  style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 17, color: 'var(--ink)' }}
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: '1px solid var(--line)',
                    background: 'var(--surface)',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  ESC
                </button>
              </div>
              {megaCategories.length > 0 && (
                <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--faint)', fontWeight: 600, marginRight: 4 }}>Popular</span>
                  {megaCategories.slice(0, 5).map((category) => (
                    <button
                      key={category}
                      type="button"
                      className="v-search-chip"
                      onClick={() => {
                        setSearchOpen(false);
                        router.push(`/products?category=${encodeURIComponent(category)}`);
                      }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </form>
          </div>
        )}
      </header>

      {/* mobile navigation drawer */}
      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} side="left" title="Menu">
        <nav className="flex flex-col gap-1 p-4" aria-label="Mobile">
          <Link href="/" onClick={() => setMobileOpen(false)} className={mobileLinkClass(pathname, '/', 'exact')}>
            Home
          </Link>
          <Link href="/products" onClick={() => setMobileOpen(false)} className={mobileLinkClass(pathname, '/products', 'prefix')}>
            Shop
          </Link>
          <Link href="/products" onClick={() => setMobileOpen(false)} className={mobileLinkClass(pathname, '/collections', 'prefix')}>
            Collections
          </Link>
          <Link href="/journal" onClick={() => setMobileOpen(false)} className={mobileLinkClass(pathname, '/journal', 'prefix')}>
            Journal
          </Link>
          <Link href="/about" onClick={() => setMobileOpen(false)} className={mobileLinkClass(pathname, '/about', 'prefix')}>
            About
          </Link>
        </nav>

        {megaCategories.length > 0 && (
          <div className="border-t border-line-soft p-4">
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.07em] text-muted">Categories</p>
            <div className="flex flex-col gap-1">
              {megaCategories.map((category) => (
                <Link
                  key={category}
                  href={`/products?category=${encodeURIComponent(category)}`}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold capitalize text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function mobileLinkClass(pathname: string, href: string, match: 'exact' | 'prefix'): string {
  return cn(
    'rounded-lg px-3 py-2.5 text-[15px] font-semibold transition-colors',
    isActivePath(pathname, href, match)
      ? 'bg-brand-50 text-brand-700 dark:text-brand-300'
      : 'text-ink-soft hover:bg-paper-2 hover:text-ink',
  );
}
