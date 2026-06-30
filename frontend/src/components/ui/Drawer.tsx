'use client';

import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';
import { useDismissable } from './useDismissable';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Slide-in side panel (cart on the right, mobile nav on the left) with the same a11y as Modal. */
export function Drawer({
  open,
  onClose,
  side = 'right',
  title,
  children,
  className,
}: DrawerProps) {
  const panelRef = useDismissable(open, onClose);
  const titleId = useId();

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="pp-fade-in pp-veil absolute inset-0 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 flex w-full max-w-sm flex-col bg-surface shadow-[var(--shadow-panel)] focus:outline-none',
          side === 'right'
            ? 'right-0 border-l border-line pp-slide-in-right'
            : 'left-0 border-r border-line pp-slide-in-left',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line-soft px-5 py-4">
          {title ? (
            <h2 id={titleId} className="font-serif text-lg font-semibold tracking-tight text-ink">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className={cn(
              'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors',
              'hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            )}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
