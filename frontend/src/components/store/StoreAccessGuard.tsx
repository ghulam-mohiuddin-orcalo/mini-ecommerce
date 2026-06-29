'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '@/lib/hooks/useAuth';

/**
 * Keeps admins out of the storefront. Admins work only in the admin dashboard, so any store
 * route bounces them to `/admin` and never renders store content for them. Customers and guests
 * pass through untouched. This is a UX gate, not a security boundary — the server still authorizes
 * every API call by role.
 */
export function StoreAccessGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user } = useMe();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) router.replace('/admin');
  }, [isAdmin, router]);

  if (isAdmin) return null; // redirecting — don't flash the storefront to an admin

  return <>{children}</>;
}
