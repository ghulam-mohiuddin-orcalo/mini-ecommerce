'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';

/* ----------------------------------------------------------------------------
 * Profile pill + dropdown — a 1:1 port of the Verdant reference account menu
 * (gradient identity header, grouped rows, danger Log out). Self-contained
 * popover (click toggle, outside-click + ESC close); inline SVGs match the
 * reference stroke widths exactly. RBAC is UI-only — every admin route is
 * independently guarded server-side; the Admin row is additive for admins.
 * -------------------------------------------------------------------------- */
function initialsOf(user: User): string {
  const fromName = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
  return (fromName || user.email[0] || '?').toUpperCase();
}

const ICON_AVATAR_GRADIENT = 'linear-gradient(150deg,#1f8a7f,#0c5b54)';

export function UserMenu({
  user,
  wishlistCount = 0,
  cartCount = 0,
  onSignOut,
  signingOut = false,
}: {
  user: User;
  wishlistCount?: number;
  cartCount?: number;
  onSignOut: () => void;
  signingOut?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isAdmin = user.role === 'ADMIN';
  const initials = initialsOf(user);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  const go = (href: string) => {
    close();
    router.push(href);
  };

  const fmt = (n: number) => (n > 99 ? '99+' : String(n));

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Account menu for ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="v-profile-pill"
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: ICON_AVATAR_GRADIENT,
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 800,
            display: 'grid',
            placeItems: 'center',
            letterSpacing: '0.02em',
          }}
        >
          {initials}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginRight: 4 }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="v-panel"
          style={{
            position: 'absolute',
            top: 54,
            right: 0,
            width: 312,
            maxWidth: 'calc(100vw - 2rem)',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 20,
            boxShadow: '0 24px 60px -20px var(--shadow2),0 4px 14px -8px var(--shadow)',
            overflow: 'hidden',
            transformOrigin: 'top right',
            zIndex: 70,
          }}
        >
          {/* Identity header */}
          <div
            style={{
              padding: '18px 18px 16px',
              background:
                'linear-gradient(160deg,color-mix(in oklab,var(--primary) 14%,var(--surface)),var(--surface))',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              gap: 13,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: ICON_AVATAR_GRADIENT,
                color: '#fff',
                fontSize: 17,
                fontWeight: 800,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                boxShadow: '0 6px 16px -8px var(--primary)',
              }}
            >
              {initials}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                    background: 'color-mix(in oklab,var(--gold-soft) 18%,transparent)',
                    border: '1px solid color-mix(in oklab,var(--gold-soft) 36%,transparent)',
                    padding: '2px 7px',
                    borderRadius: 20,
                  }}
                >
                  {isAdmin ? 'Admin' : 'Member'}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.email}
              </div>
            </div>
          </div>

          {/* Primary group */}
          <div style={{ padding: 8, display: 'grid', gap: 1 }}>
            <button type="button" role="menuitem" className="v-menu-row" onClick={() => go('/profile')}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
              My Profile
            </button>
            <button type="button" role="menuitem" className="v-menu-row" onClick={() => go('/orders')}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              Orders
            </button>
            <button type="button" role="menuitem" className="v-menu-row v-menu-row--between" onClick={() => go('/wishlist')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.5-1.5 3-3.3 3-5.5A4.5 4.5 0 0 0 12 5 4.5 4.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7Z" />
                </svg>
                Wishlist
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--surface2)', padding: '1px 8px', borderRadius: 20 }}>
                {fmt(wishlistCount)}
              </span>
            </button>
            <button type="button" role="menuitem" className="v-menu-row v-menu-row--between" onClick={() => go('/cart')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2.5 3h2l2.6 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21.5 7H6" />
                </svg>
                Bag
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--surface2)', padding: '1px 8px', borderRadius: 20 }}>
                {fmt(cartCount)}
              </span>
            </button>
          </div>

          <div style={{ height: 1, background: 'var(--line)', margin: '4px 12px' }} />

          {/* Secondary group */}
          <div style={{ padding: 8, display: 'grid', gap: 1 }}>
            <button type="button" role="menuitem" className="v-menu-row" onClick={() => go('/products')}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3 1.9 4 4.4.6-3.2 3 .8 4.4L12 13l-3.9 2 .8-4.4-3.2-3 4.4-.6Z" />
              </svg>
              Recommendations
            </button>
            <button type="button" role="menuitem" className="v-menu-row" onClick={() => go('/settings')}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.92 1.06V21a2 2 0 1 1-4 0 1.65 1.65 0 0 0-2.92-1.06l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.6-1.18 2 2 0 1 1 0-4A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 10 4.6a1.65 1.65 0 0 0 1.18-1.6 2 2 0 1 1 4 0A1.65 1.65 0 0 0 19 4.6l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9Z" />
              </svg>
              Settings
            </button>
            <button type="button" role="menuitem" className="v-menu-row" onClick={() => go('/contact')}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
              Support
            </button>
            {isAdmin && (
              <button type="button" role="menuitem" className="v-menu-row" onClick={() => go('/admin')}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                Admin dashboard
              </button>
            )}
          </div>

          <button type="button" role="menuitem" className="v-logout" disabled={signingOut} onClick={onSignOut}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            {signingOut ? 'Signing out…' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  );
}
