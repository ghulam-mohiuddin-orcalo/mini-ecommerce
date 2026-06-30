'use client';

import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

type Align = 'start' | 'end';

export interface DropdownProps {
  /**
   * The clickable element. Receives `aria-haspopup`, `aria-expanded` and an `onClick`
   * toggle merged in, so pass a single focusable element (e.g. a Button).
   */
  trigger: ReactElement<{
    onClick?: (e: MouseEvent) => void;
    'aria-haspopup'?: boolean | 'menu';
    'aria-expanded'?: boolean;
  }>;
  children: ReactNode;
  /** Horizontal alignment of the panel relative to the trigger. */
  align?: Align;
  className?: string;
  /** Set true for arrow-key roving among items (profile/menu); false for free-form panels (mega-menu). */
  menu?: boolean;
}

const FOCUSABLE = 'a[href],button:not([disabled]),[role="menuitem"],[tabindex]:not([tabindex="-1"])';

/** Anchored popover/menu: click-outside + ESC close, optional arrow-key roving, ARIA wiring. */
export function Dropdown({
  trigger,
  children,
  align = 'start',
  className,
  menu = true,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close();
        (rootRef.current?.querySelector<HTMLElement>('[aria-haspopup]'))?.focus();
        return;
      }
      if (!menu || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(idx + 1) % items.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1].focus();
      }
    }

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    // Focus the first item when opening a roving menu.
    if (menu) panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, menu, close]);

  const triggerEl = cloneElement(trigger, {
    'aria-haspopup': menu ? 'menu' : true,
    'aria-expanded': open,
    onClick: (e: MouseEvent) => {
      trigger.props.onClick?.(e);
      setOpen((v) => !v);
    },
  });

  return (
    <div ref={rootRef} className="relative inline-block">
      {triggerEl}
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role={menu ? 'menu' : undefined}
          className={cn(
            'pp-pop-in absolute top-full z-50 mt-2 min-w-48 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow-panel)]',
            align === 'end' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export interface DropdownItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

/** Convenience row for menu-style dropdowns (role="menuitem", system hover/focus). */
export function DropdownItem({ className, children, ...props }: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-soft transition-colors',
        'hover:bg-paper-2 hover:text-ink focus-visible:bg-paper-2 focus-visible:text-ink focus-visible:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
