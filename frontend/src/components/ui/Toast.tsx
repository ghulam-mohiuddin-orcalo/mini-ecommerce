'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

type ToastVariant = 'default' | 'success' | 'error';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms; defaults to 4000. Pass 0 to disable auto-dismiss. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON: Record<ToastVariant, IconName> = {
  default: 'info',
  success: 'check-circle',
  error: 'alert-triangle',
};

const ICON_TONE: Record<ToastVariant, string> = {
  default: 'text-brand-500 dark:text-brand-300',
  success: 'text-success',
  error: 'text-danger',
};

/** Wrap the app once; exposes `useToast()` for fire-and-forget notifications. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const nextId = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ duration = 4000, ...opts }: ToastOptions) => {
      const id = nextId.current++;
      setItems((prev) => [...prev, { id, duration, ...opts }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4"
          >
            {items.map((t) => {
              const variant = t.variant ?? 'default';
              return (
                <div
                  key={t.id}
                  role="status"
                  className={cn(
                    'pp-toast-in pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow-panel)] sm:w-80',
                  )}
                >
                  <Icon
                    name={ICON[variant]}
                    size={18}
                    className={cn('mt-0.5', ICON_TONE[variant])}
                  />
                  <div className="min-w-0 flex-1">
                    {t.title && (
                      <p className="text-sm font-semibold tracking-tight text-ink">{t.title}</p>
                    )}
                    {t.description && (
                      <p className="text-sm leading-snug text-ink-soft">{t.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss notification"
                    className={cn(
                      '-mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted transition-colors',
                      'hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    )}
                  >
                    <Icon name="x" size={15} />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

/** Access the toast dispatcher. Must be used under a `ToastProvider`. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
