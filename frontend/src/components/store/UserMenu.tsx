'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import type { User } from '@/lib/types';

/* ----------------------------------------------------------------------------
 * Lucide-style icons, inlined (24×24, stroke 2) to match the rest of the
 * codebase's icon approach and avoid adding a runtime dependency.
 * Paths are Lucide's (MIT).
 * -------------------------------------------------------------------------- */
type IconName =
  | 'user'
  | 'orders'
  | 'cart'
  | 'sparkles'
  | 'settings'
  | 'logout'
  | 'dashboard'
  | 'clipboard'
  | 'analytics'
  | 'store'
  | 'chevron'
  | 'check';

const ICONS: Record<IconName, ReactNode> = {
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  orders: (
    <>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </>
  ),
  cart: (
    <>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </>
  ),
  sparkles: (
    <>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
    </>
  ),
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </>
  ),
  dashboard: (
    <>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </>
  ),
  clipboard: (
    <>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </>
  ),
  analytics: (
    <>
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </>
  ),
  store: (
    <>
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  check: <path d="M20 6 9 17l-5-5" />,
};

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

/* ----------------------------------------------------------------------------
 * Menu model
 * -------------------------------------------------------------------------- */
type MenuItem =
  | { kind: 'link'; label: string; href: string; icon: IconName; match?: 'exact' | 'prefix'; badge?: number }
  | { kind: 'signout'; label: string; icon: IconName };

const CUSTOMER_GROUPS: MenuItem[][] = [
  [
    { kind: 'link', label: 'My Profile', href: '/profile', icon: 'user', match: 'prefix' },
    { kind: 'link', label: 'My Orders', href: '/orders', icon: 'orders', match: 'prefix' },
    { kind: 'link', label: 'My Cart', href: '/cart', icon: 'cart', match: 'prefix' },
    { kind: 'link', label: 'Recommended Products', href: '/#recommended', icon: 'sparkles' },
    { kind: 'link', label: 'Settings', href: '/settings', icon: 'settings', match: 'prefix' },
  ],
  [{ kind: 'signout', label: 'Sign Out', icon: 'logout' }],
];

const ADMIN_GROUPS: MenuItem[][] = [
  [
    { kind: 'link', label: 'Dashboard', href: '/admin', icon: 'dashboard', match: 'exact' },
    { kind: 'link', label: 'Product Management', href: '/admin/products', icon: 'orders', match: 'prefix' },
    { kind: 'link', label: 'Order Management', href: '/admin/orders', icon: 'clipboard', match: 'prefix' },
    { kind: 'link', label: 'Analytics', href: '/admin#analytics', icon: 'analytics' },
  ],
  [
    { kind: 'link', label: 'Storefront', href: '/', icon: 'store', match: 'exact' },
    { kind: 'link', label: 'My Profile', href: '/profile', icon: 'user', match: 'prefix' },
  ],
  [{ kind: 'signout', label: 'Sign Out', icon: 'logout' }],
];

function initialsOf(user: User): string {
  const fromName = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return (fromName || user.email[0] || '?').toUpperCase();
}

/* ----------------------------------------------------------------------------
 * UserMenu — avatar trigger + accessible dropdown.
 * Auth/RBAC are decided by the caller (role + onSignOut); this is UI only.
 * -------------------------------------------------------------------------- */
export function UserMenu({
  user,
  cartCount,
  onSignOut,
  signingOut = false,
}: {
  user: User;
  cartCount: number;
  onSignOut: () => void;
  signingOut?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = user.role === 'ADMIN';
  const groups = isAdmin ? ADMIN_GROUPS : CUSTOMER_GROUPS;
  const roleLabel = isAdmin ? 'Administrator' : 'Customer';

  const close = (focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  // On open, move focus to the first menu item (keyboard-friendly).
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
  }, [open]);

  const items = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const list = items();
    if (list.length === 0) return;
    const idx = list.indexOf(document.activeElement as HTMLElement);
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close(true);
        break;
      case 'ArrowDown':
        e.preventDefault();
        list[(idx + 1 + list.length) % list.length]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        list[(idx - 1 + list.length) % list.length]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        list[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        list[list.length - 1]?.focus();
        break;
    }
  };

  const isActive = (item: Extract<MenuItem, { kind: 'link' }>) => {
    if (item.href.includes('#')) return false; // anchor deep-links don't own a route
    if (item.match === 'exact') return pathname === item.href;
    if (item.match === 'prefix') return pathname === item.href || pathname.startsWith(`${item.href}/`);
    return pathname === item.href;
  };

  const rowBase =
    'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
        className={cn(
          'flex items-center gap-2 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          open && 'bg-paper-2',
        )}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-[13px] font-bold text-white ring-1 ring-inset ring-white/10">
          {initialsOf(user)}
        </span>
        <Icon
          name="chevron"
          className={cn('hidden text-muted transition-transform duration-200 sm:block', open && 'rotate-180')}
        />
      </button>

      <div
        ref={menuRef}
        role="menu"
        aria-orientation="vertical"
        aria-label="Account"
        inert={!open ? true : undefined}
        onKeyDown={onMenuKeyDown}
        className={cn(
          'absolute right-0 top-[calc(100%+8px)] z-50 w-72 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow-panel)]',
          'transition-[opacity,transform] duration-150 ease-out',
          open
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-y-1 scale-95 opacity-0',
        )}
      >
        {/* Identity header */}
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {initialsOf(user)}
          </span>
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
            <p className="mt-0.5 text-[11px] font-semibold text-faint">{roleLabel}</p>
          </div>
        </div>

        {groups.map((group, gi) => (
          <div key={gi}>
            <div className="my-1 h-px bg-[var(--color-line-soft)]" role="separator" />
            <div className="flex flex-col">
              {group.map((item) => {
                if (item.kind === 'signout') {
                  return (
                    <button
                      key={item.label}
                      role="menuitem"
                      type="button"
                      disabled={signingOut}
                      onClick={() => {
                        close();
                        onSignOut();
                      }}
                      className={cn(
                        rowBase,
                        'text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] disabled:opacity-50',
                      )}
                    >
                      <Icon name={item.icon} />
                      {signingOut ? 'Signing out…' : item.label}
                    </button>
                  );
                }
                const active = isActive(item);
                return (
                  <Link
                    key={item.label}
                    role="menuitem"
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => close()}
                    className={cn(
                      rowBase,
                      active ? 'bg-brand-50 text-brand-700 dark:text-brand-300' : 'text-ink-soft hover:bg-paper-2',
                    )}
                  >
                    <Icon name={item.icon} className={active ? 'text-brand-600 dark:text-brand-300' : 'text-muted'} />
                    <span className="flex-1">{item.label}</span>
                    {item.href === '/cart' && cartCount > 0 && (
                      <span className="inline-grid min-w-[18px] place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                        {cartCount}
                      </span>
                    )}
                    {active && <Icon name="check" className="text-brand-600 dark:text-brand-300" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
