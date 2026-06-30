'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { User } from '@/lib/types';

/* ----------------------------------------------------------------------------
 * Menu model. RBAC is decided by the caller (role + onSignOut); this is UI only —
 * every admin route is independently guarded server-side.
 * -------------------------------------------------------------------------- */
type MenuLink = { label: string; href: string; icon: IconName; match: 'exact' | 'prefix' };

const CUSTOMER_LINKS: MenuLink[] = [
  { label: 'My Profile', href: '/profile', icon: 'user', match: 'prefix' },
  { label: 'My Orders', href: '/orders', icon: 'package', match: 'prefix' },
  { label: 'Wishlist', href: '/wishlist', icon: 'heart', match: 'prefix' },
  { label: 'Settings', href: '/settings', icon: 'login', match: 'prefix' },
];

const ADMIN_EXTRA: MenuLink = { label: 'Admin dashboard', href: '/admin', icon: 'grid', match: 'prefix' };

function initialsOf(user: User): string {
  const fromName = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return (fromName || user.email[0] || '?').toUpperCase();
}

function Avatar({ user, size = 'md' }: { user: User; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white ring-1 ring-inset ring-white/10',
        size === 'sm' ? 'h-9 w-9 text-[13px]' : 'h-10 w-10 text-sm',
      )}
    >
      {initialsOf(user)}
    </span>
  );
}

/* ----------------------------------------------------------------------------
 * UserMenu — profile dropdown built on the shared Dropdown primitive (roving menu).
 * -------------------------------------------------------------------------- */
export function UserMenu({
  user,
  cartCount,
  onSignOut,
  signingOut = false,
}: {
  user: User;
  /** Reserved for future use (cart count is shown in the header itself). */
  cartCount?: number;
  onSignOut: () => void;
  signingOut?: boolean;
}) {
  void cartCount;
  const pathname = usePathname();
  const isAdmin = user.role === 'ADMIN';
  const links = isAdmin ? [...CUSTOMER_LINKS, ADMIN_EXTRA] : CUSTOMER_LINKS;

  const isActive = (link: MenuLink) =>
    link.match === 'exact'
      ? pathname === link.href
      : pathname === link.href || pathname.startsWith(`${link.href}/`);

  const rowBase =
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:bg-paper-2';

  const trigger = (
    <button
      type="button"
      aria-label={`Account menu for ${user.name}`}
      className={cn(
        'flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors',
        'hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
      )}
    >
      <Avatar user={user} size="sm" />
      <Icon name="chevron-down" size={15} className="hidden text-muted sm:block" />
    </button>
  );

  return (
    <Dropdown trigger={trigger} align="end" menu className="w-72 max-w-[calc(100vw-2rem)]">
      {/* Identity header */}
      <div className="flex items-center gap-3 px-2.5 py-2.5">
        <Avatar user={user} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-ink">{user.name}</p>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]',
                isAdmin ? 'bg-brand-100 text-brand-700 dark:text-brand-300' : 'bg-paper-2 text-ink-soft',
              )}
            >
              {isAdmin ? 'Admin' : 'Customer'}
            </span>
          </div>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
      </div>

      <div className="my-1 h-px bg-line-soft" role="separator" />

      <div className="flex flex-col">
        {links.map((link) => {
          const active = isActive(link);
          return (
            <Link
              key={link.href}
              role="menuitem"
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                rowBase,
                active ? 'bg-brand-50 text-brand-700 dark:text-brand-300' : 'text-ink-soft hover:bg-paper-2',
              )}
            >
              <Icon
                name={link.icon}
                size={16}
                className={active ? 'text-brand-600 dark:text-brand-300' : 'text-muted'}
              />
              <span className="flex-1">{link.label}</span>
              {active && <Icon name="check" size={16} className="text-brand-600 dark:text-brand-300" />}
            </Link>
          );
        })}
      </div>

      <div className="my-1 h-px bg-line-soft" role="separator" />

      <SignOutRow signingOut={signingOut} onSignOut={onSignOut} rowBase={rowBase} />
    </Dropdown>
  );
}

function SignOutRow({
  signingOut,
  onSignOut,
  rowBase,
}: {
  signingOut: boolean;
  onSignOut: () => void;
  rowBase: string;
}): ReactNode {
  return (
    <button
      role="menuitem"
      type="button"
      disabled={signingOut}
      onClick={onSignOut}
      className={cn(
        rowBase,
        'text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] disabled:opacity-50',
      )}
    >
      <Icon name="logout" size={16} />
      {signingOut ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
