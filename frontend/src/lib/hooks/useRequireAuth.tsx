'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMe } from '@/lib/hooks/useAuth';
import { signinHref } from '@/lib/authNav';
import type { User } from '@/lib/types';

/**
 * Gate a protected store page behind authentication. While the session resolves — and
 * whenever the visitor turns out to be a guest — it redirects to `/signin`, preserving the
 * current path as `?next=` so the visitor lands back here after signing in.
 *
 * Usage:
 *   const { user, gate } = useRequireAuth();
 *   if (gate) return gate;        // loading or redirecting
 *   // ...render with `user` (guaranteed present)
 */
export function useRequireAuth(): { user: User | null | undefined; gate: React.ReactNode | null } {
  const { data: user, isLoading } = useMe();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(signinHref(pathname));
    }
  }, [isLoading, user, router, pathname]);

  if (user) return { user, gate: null };

  // Loading, or a guest mid-redirect: hold the layout with a calm centred spinner.
  return {
    user: user ?? undefined,
    gate: (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
        <span className="sr-only">Loading…</span>
      </div>
    ),
  };
}
