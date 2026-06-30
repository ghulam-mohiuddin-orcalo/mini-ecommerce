'use client';

import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';
import { useDismissable } from './useDismissable';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Constrain the panel width; defaults to a comfortable reading column. */
  className?: string;
}

/** Accessible centered dialog: focus trap, ESC/backdrop close, scroll-lock, focus restore. */
export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  const panelRef = useDismissable(open, onClose);
  const titleId = useId();

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          'pp-pop-in relative w-full max-w-lg rounded-2xl border border-line bg-surface shadow-[var(--shadow-panel)] focus:outline-none',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          {title && (
            <h2 id={titleId} className="font-serif text-xl font-semibold tracking-tight text-ink">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className={cn(
              '-mr-1 ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors',
              'hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            )}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="px-6 py-4 text-sm leading-relaxed text-ink-soft">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-line-soft px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
