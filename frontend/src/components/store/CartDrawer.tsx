'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { PriceTag } from '@/components/ui/PriceTag';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { formatPrice } from '@/lib/format';
import { useMe } from '@/lib/hooks/useAuth';
import {
  useCart,
  useUpdateCartItem,
  useRemoveCartItem,
} from '@/lib/hooks/useCart';
import type { CartLine } from '@/lib/types';

/** Free-shipping threshold in integer cents ($50). Purely presentational — the server is
 * authoritative for any real shipping/total calculation; this only drives the progress bar. */
const FREE_SHIPPING_THRESHOLD_CENTS = 5000;

/* ----------------------------------------------------------------------------
 * Open-state context. Kept self-contained here so the header (and anything else
 * inside the provider) can open the mini-cart without prop-drilling. The provider
 * also renders the Drawer itself, so mounting it once wires up the whole feature.
 * -------------------------------------------------------------------------- */
interface CartDrawerContextValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

export function useCartDrawer(): CartDrawerContextValue {
  const ctx = useContext(CartDrawerContext);
  if (!ctx) throw new Error('useCartDrawer must be used within a CartDrawerProvider');
  return ctx;
}

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo<CartDrawerContextValue>(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <CartDrawerContext.Provider value={value}>
      {children}
      <CartDrawer open={isOpen} onClose={close} />
    </CartDrawerContext.Provider>
  );
}

/* ----------------------------------------------------------------------------
 * Quantity stepper for a single line. Non-optimistic: each change PATCHes and the
 * server-recomputed cart is written to the cache by the hook.
 * -------------------------------------------------------------------------- */
function LineStepper({
  line,
  disabled,
  onChange,
}: {
  line: CartLine;
  disabled: boolean;
  onChange: (quantity: number) => void;
}) {
  const atMax = line.quantity >= line.stock;
  return (
    <div className="inline-flex items-center rounded-lg border border-line bg-surface">
      <button
        type="button"
        disabled={disabled || line.quantity <= 1}
        onClick={() => onChange(line.quantity - 1)}
        aria-label="Decrease quantity"
        className="grid h-8 w-8 place-items-center rounded-l-lg text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon name="minus" size={14} />
      </button>
      <span aria-live="polite" className="grid h-8 min-w-8 place-items-center px-1 text-sm font-bold tabular-nums text-ink">
        {line.quantity}
      </span>
      <button
        type="button"
        disabled={disabled || atMax}
        onClick={() => onChange(line.quantity + 1)}
        aria-label="Increase quantity"
        className="grid h-8 w-8 place-items-center rounded-r-lg text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}

function CartLineRow({ line }: { line: CartLine }) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const busy = update.isPending || remove.isPending;

  return (
    <li className="flex gap-3.5 py-4">
      <Link
        href={`/products/${line.productId}`}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-paper-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={line.imageUrl}
          alt={line.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/products/${line.productId}`}
              className="line-clamp-2 text-sm font-bold leading-snug text-ink hover:text-brand-600 dark:hover:text-brand-300"
            >
              {line.name}
            </Link>
            {line.variantLabel && (
              <p className="mt-0.5 text-xs font-semibold text-muted">{line.variantLabel}</p>
            )}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => remove.mutate({ productId: line.productId, variantId: line.variantId })}
            aria-label={`Remove ${line.name} from cart`}
            className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40"
          >
            <Icon name="trash" size={15} />
          </button>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <LineStepper
            line={line}
            disabled={busy}
            onChange={(quantity) =>
              update.mutate({ productId: line.productId, quantity, variantId: line.variantId })
            }
          />
          <div className="text-right">
            <PriceTag priceCents={line.lineTotalCents} size="sm" />
            {line.quantity > 1 && (
              <p className="text-[11px] text-muted">{formatPrice(line.unitPriceCents)} each</p>
            )}
          </div>
        </div>

        {!line.available && (
          <p className="mt-1.5 text-xs font-semibold text-[var(--color-danger-ink)]">
            Only {line.stock} in stock
          </p>
        )}
      </div>
    </li>
  );
}

function FreeShippingBar({ totalCents }: { totalCents: number }) {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - totalCents);
  const pct = Math.min(100, Math.round((totalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100));
  const qualified = remaining === 0;

  return (
    <div className="rounded-xl border border-line bg-paper-2 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon name="truck" size={16} className="text-brand-600 dark:text-brand-300" />
        {qualified ? (
          <span>You&rsquo;ve unlocked free shipping.</span>
        ) : (
          <span>
            Add <span className="text-brand-600 dark:text-brand-300">{formatPrice(remaining)}</span> for free
            shipping.
          </span>
        )}
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Progress toward free shipping"
      >
        <div
          className={cn(
            'h-full rounded-full bg-brand-600 transition-[width] duration-500 dark:bg-brand-400',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * The drawer body. Renders loading / error / empty / populated states.
 * -------------------------------------------------------------------------- */
function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: user } = useMe();
  const signedIn = Boolean(user);
  const { data: cart, isLoading, isError, refetch } = useCart(signedIn);

  return (
    <Drawer open={open} onClose={onClose} side="right" title="Your cart">
      {!signedIn ? (
        <div className="px-5 py-8">
          <EmptyState
            title="Sign in to view your cart"
            description="Your cart syncs to your account so it follows you across devices."
            icon={<Icon name="cart" size={26} />}
            action={
              <Link href="/login" onClick={onClose}>
                <Button>Sign in</Button>
              </Link>
            }
          />
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-4 px-5 py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3.5">
              <Skeleton className="h-20 w-20 rounded-xl" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="mt-3 h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="px-5 py-8">
          <ErrorState
            message="We couldn’t load your cart. Please try again."
            onRetry={() => void refetch()}
          />
        </div>
      ) : !cart || cart.items.length === 0 ? (
        <div className="px-5 py-8">
          <EmptyState
            title="Your cart is empty"
            description="Browse the shop and add something you love."
            icon={<Icon name="cart" size={26} />}
            action={
              <Link href="/products" onClick={onClose}>
                <Button>Start shopping</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="px-5 pt-4">
            <FreeShippingBar totalCents={cart.totalCents} />
          </div>

          <ul className="flex-1 divide-y divide-line-soft overflow-y-auto px-5">
            {cart.items.map((line) => (
              <CartLineRow key={`${line.productId}:${line.variantId ?? 'base'}`} line={line} />
            ))}
          </ul>

          <div className="border-t border-line bg-surface px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-ink-soft">Subtotal</span>
              <span className="text-lg font-bold tracking-tight text-ink">
                {formatPrice(cart.totalCents)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">Shipping and taxes calculated at checkout.</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <Link href="/checkout" onClick={onClose} className="block">
                <Button className="w-full">
                  Checkout
                  <Icon name="arrow-right" size={16} />
                </Button>
              </Link>
              <Link href="/cart" onClick={onClose} className="block">
                <Button variant="secondary" className="w-full">
                  View cart
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
