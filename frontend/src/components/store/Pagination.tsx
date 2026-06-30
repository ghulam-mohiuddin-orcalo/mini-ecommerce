'use client';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/** Build a compact, windowed page list with ellipses, e.g. 1 … 4 5 6 … 12. */
function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push('gap');
    out.push(p);
    prev = p;
  }
  return out;
}

const cellBase =
  'grid h-[38px] min-w-[38px] place-items-center rounded-[10px] px-2 text-sm transition-colors';

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-1.5 pt-2" aria-label="Catalog pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(
          cellBase,
          'border border-line bg-surface font-semibold text-ink hover:bg-paper-2',
          'disabled:cursor-not-allowed disabled:border-line disabled:text-faint disabled:hover:bg-surface',
        )}
      >
        <Icon name="chevron-left" size={16} />
      </button>

      {pageWindow(page, totalPages).map((item, i) =>
        item === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-faint" aria-hidden="true">
            …
          </span>
        ) : item === page ? (
          <span
            key={item}
            aria-current="page"
            className={cn(cellBase, 'bg-brand-600 font-bold text-white')}
          >
            {item}
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            aria-label={`Page ${item}`}
            className={cn(cellBase, 'border border-line bg-surface font-semibold text-ink hover:bg-paper-2')}
          >
            {item}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(
          cellBase,
          'border border-line bg-surface font-semibold text-ink hover:bg-paper-2',
          'disabled:cursor-not-allowed disabled:border-line disabled:text-faint disabled:hover:bg-surface',
        )}
      >
        <Icon name="chevron-right" size={16} />
      </button>
    </nav>
  );
}
