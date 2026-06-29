'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { useMe } from '@/lib/hooks/useAuth';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useMe();
  const pathname = usePathname();

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-10"><Skeleton className="h-64 w-full" /></div>;
  }

  // Client-side gate; the server is the real authority (every admin API requires ADMIN).
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-ink">Admins only</h1>
        <p className="text-muted">You don’t have access to this area.</p>
        <Link href={user ? '/' : '/login'}>
          <Button>{user ? 'Back to store' : 'Sign in'}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-sm font-bold text-white">A</span>
              <span className="font-semibold tracking-tight text-ink">Admin</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => {
                const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'rounded-lg px-3 py-2 font-medium transition-colors',
                      active ? 'bg-brand-100 text-brand-800' : 'text-ink hover:bg-brand-50',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <Link href="/" className="text-sm font-medium text-muted hover:text-ink">
            ← Store
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
