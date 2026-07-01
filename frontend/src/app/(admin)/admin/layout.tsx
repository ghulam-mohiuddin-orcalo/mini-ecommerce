'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ToastProvider } from '@/components/ui/Toast';
import { VerdantMark } from '@/components/store/VerdantLogo';
import { cn } from '@/lib/cn';
import { useMe, useLogout } from '@/lib/hooks/useAuth';

type NavItem = { href: string; label: string; icon: ReactNode };

const NAV: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/admin/products',
    label: 'Products',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 7l9-4 9 4-9 4-9-4z" />
        <path d="M3 7v10l9 4 9-4V7" />
        <path d="M12 11v10" />
      </svg>
    ),
  },
  {
    href: '/admin/orders',
    label: 'Orders',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 4h16v4H4z" />
        <path d="M5 8v12h14V8" />
        <path d="M9 12h6" />
      </svg>
    ),
  },
  {
    href: '/admin/articles',
    label: 'Articles',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 4h11a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z" />
        <path d="M17 8h2a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2" />
        <path d="M8 8h5M8 12h5" />
      </svg>
    ),
  },
  {
    href: '/admin/faq',
    label: 'FAQ',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
  {
    href: '/admin/content',
    label: 'Content',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 9h10M7 13h10M7 17h6" />
      </svg>
    ),
  },
  {
    href: '/admin/contact',
    label: 'Contact',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
];

function isActive(href: string, pathname: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useMe();
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const signOut = () => {
    setProfileMenuOpen(false);
    // Logout never bounces to the sign-in page — clear the session and land on the storefront home.
    logout.mutate(undefined, { onSuccess: () => router.replace('/') });
  };

  useEffect(() => {
    if (!profileMenuOpen) return;

    const closeOnPointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-admin-profile-menu]')) {
        setProfileMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };

    document.addEventListener('mousedown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [profileMenuOpen]);

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-10"><Skeleton className="h-64 w-full" /></div>;
  }

  // Client-side gate; the server is the real authority (every admin API requires ADMIN).
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Admins only</h1>
        <p className="text-muted">You don’t have access to this area.</p>
        <Link href={user ? '/' : '/signin'}>
          <Button>{user ? 'Back to store' : 'Sign in'}</Button>
        </Link>
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <ToastProvider>
      <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[228px_1fr]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r border-line bg-surface p-4 lg:flex">
          <Link href="/admin" className="flex items-center gap-2.5 px-1.5 pt-2">
            <VerdantMark className="h-[30px] w-[30px] text-white" iconClassName="h-[17px] w-[17px]" />
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight text-ink">Verdant</span>
              <span className="text-[11px] font-semibold text-muted">Admin</span>
            </span>
          </Link>

          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors',
                    active
                      ? 'bg-brand-100 font-bold text-brand-700 dark:text-brand-300'
                      : 'font-semibold text-ink-soft hover:bg-paper-2 hover:text-ink',
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div data-admin-profile-menu className="relative mt-auto">
            {profileMenuOpen && (
              <div className="absolute bottom-[calc(100%+10px)] left-0 z-30 w-full overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-soft">
                <div className="flex items-center justify-between rounded-lg px-2.5 py-2">
                  <span className="text-[11px] font-semibold text-muted">Appearance</span>
                  <ThemeToggle />
                </div>
                <Link
                  href="/profile"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M5 21a7 7 0 0 1 14 0" />
                  </svg>
                  Profile
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z" />
                    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.36a1.7 1.7 0 0 0-1 .34 1.7 1.7 0 0 0-.83 1.46V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-.83-1.46 1.7 1.7 0 0 0-1-.34 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-.34-1H4.2a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 .34-1.91l-.06-.06A2 2 0 1 1 7.4 5.2l.06.06A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1-.34V4.2a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 .34 1.7 1.7 0 0 0 1.87-.34l.06-.06A2 2 0 1 1 19.76 7.06l-.06.06A1.7 1.7 0 0 0 19.36 9c.07.3.19.61.34.9h.1a2 2 0 1 1 0 4h-.09c-.15.29-.27.6-.31 1.1z" />
                  </svg>
                  Settings
                </Link>
                <Link
                  href="/"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 10.5 12 3l9 7.5" />
                    <path d="M5 9.5V21h14V9.5" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                  View store
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  disabled={logout.isPending}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink disabled:opacity-50"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M10 17l5-5-5-5" />
                    <path d="M15 12H3" />
                    <path d="M13 4h6v16h-6" />
                  </svg>
                  {logout.isPending ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setProfileMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              className="flex w-full items-center gap-2.5 rounded-xl bg-paper-2 p-3 text-left transition-colors hover:bg-brand-50 focus:outline-none focus:ring-[3px] focus:ring-brand-500/15 dark:hover:bg-paper"
            >
              <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-brand-600 text-[13px] font-bold text-white">
                {initials}
              </span>
              <span className="flex min-w-0 flex-1 flex-col leading-snug">
                <span className="truncate text-[13px] font-bold text-ink">{user.name}</span>
                <span className="text-[11px] text-muted">Administrator</span>
              </span>
              <svg
                className={cn('h-4 w-4 shrink-0 text-muted transition-transform', profileMenuOpen && 'rotate-180')}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="border-b border-line bg-surface lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/admin" className="flex items-center gap-2">
              <VerdantMark className="h-8 w-8 text-white" iconClassName="h-[18px] w-[18px]" />
              <span className="font-bold tracking-tight text-ink">Admin</span>
            </Link>
            <div data-admin-profile-menu className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                className="flex items-center gap-2 rounded-full bg-paper-2 p-1.5 pr-2.5 text-left transition-colors hover:bg-brand-50 focus:outline-none focus:ring-[3px] focus:ring-brand-500/15"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {initials}
                </span>
                <svg
                  className={cn('h-4 w-4 text-muted transition-transform', profileMenuOpen && 'rotate-180')}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-56 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-soft">
                  <div className="border-b border-line px-2.5 py-2">
                    <p className="truncate text-sm font-bold text-ink">{user.name}</p>
                    <p className="text-xs text-muted">Administrator</p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg px-2.5 py-2">
                    <span className="text-[11px] font-semibold text-muted">Appearance</span>
                    <ThemeToggle />
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="block rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="block rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
                  >
                    Settings
                  </Link>
                  <Link
                    href="/"
                    onClick={() => setProfileMenuOpen(false)}
                    className="block rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
                  >
                    View store
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    disabled={logout.isPending}
                    className="block w-full rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink disabled:opacity-50"
                  >
                    {logout.isPending ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              )}
            </div>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-3 text-sm">
            {NAV.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold transition-colors',
                    active ? 'bg-brand-100 text-brand-700 dark:text-brand-300' : 'text-ink-soft hover:bg-paper-2 hover:text-ink',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="px-4 py-8 sm:px-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
