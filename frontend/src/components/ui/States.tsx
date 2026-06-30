import type { ReactNode } from 'react';
import { Button } from './Button';

function DefaultEmptyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 6h15l-1.5 9h-12z" />
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M6 6 5 2H2" />
    </svg>
  );
}

/** Shared, reusable empty/error presentational blocks. */
export function EmptyState({
  title = 'Nothing here yet',
  description,
  action,
  icon,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)]">
      <span
        aria-hidden="true"
        className="grid h-15 w-15 place-items-center rounded-2xl bg-brand-50 text-brand-500 dark:text-brand-300"
      >
        {icon ?? <DefaultEmptyIcon />}
      </span>
      <p className="text-base font-extrabold tracking-tight text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message = 'We couldn’t load this right now. Please try again.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)]"
    >
      <span
        aria-hidden="true"
        className="grid h-15 w-15 place-items-center rounded-2xl bg-[var(--color-danger-soft)] text-[var(--color-danger-ink)]"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
      </span>
      <p className="text-base font-extrabold tracking-tight text-ink">Something went wrong</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-1">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          Retry
        </Button>
      )}
    </div>
  );
}
