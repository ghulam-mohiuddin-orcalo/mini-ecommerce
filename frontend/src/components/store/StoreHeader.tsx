'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useMe, useLogout } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';
import { UserMenu } from './UserMenu';

/** Storefront top navigation: shop link, cart with live count, and a consolidated profile menu. */
export function StoreHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user } = useMe();
  const { data: cart } = useCart(Boolean(user));
  const logout = useLogout();

  const count = cart?.itemCount ?? 0;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-brand-600 text-[15px] font-extrabold text-white">
            P
          </span>
          <span className="text-[17px] font-bold tracking-tight text-ink">Pine &amp; Parcel</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/products"
            className={cn(
              'rounded-lg px-3.5 py-2 font-semibold transition-colors',
              pathname.startsWith('/products')
                ? 'text-ink'
                : 'text-ink-soft hover:bg-paper-2 hover:text-ink',
            )}
          >
            Shop
          </Link>
          <Link
            href="/cart"
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 font-semibold transition-colors',
              pathname.startsWith('/cart') ? 'text-ink' : 'text-ink-soft hover:bg-paper-2 hover:text-ink',
            )}
            aria-label={`Cart${count > 0 ? `, ${count} item${count === 1 ? '' : 's'}` : ''}`}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 6h15l-1.5 9h-12z" />
              <circle cx="9" cy="20" r="1.4" />
              <circle cx="18" cy="20" r="1.4" />
              <path d="M6 6 5 2H2" />
            </svg>
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span className="inline-grid min-w-[19px] place-items-center rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="pl-1.5">
              <UserMenu
                user={user}
                cartCount={count}
                signingOut={logout.isPending}
                onSignOut={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
              />
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-1.5 rounded-lg bg-ink px-4 py-2 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
