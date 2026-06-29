'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMe, useLogout } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';

/** Storefront top navigation: shop link, cart with live count, and account state. */
export function StoreHeader() {
  const router = useRouter();
  const { data: user } = useMe();
  const { data: cart } = useCart(Boolean(user));
  const logout = useLogout();

  const count = cart?.itemCount ?? 0;

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
          <Link
            href="/cart"
            className="relative rounded-lg px-3 py-2 font-medium text-ink transition-colors hover:bg-brand-50"
          >
            Cart
            {count > 0 && (
              <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <div className="flex items-center gap-2 pl-2">
              <span className="hidden text-muted sm:inline">{user.name}</span>
              <button
                onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
                className="rounded-lg px-3 py-2 font-medium text-ink transition-colors hover:bg-brand-50"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 font-medium text-ink transition-colors hover:bg-brand-50"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
