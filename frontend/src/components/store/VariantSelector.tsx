'use client';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import type { ProductVariant } from '@/lib/types';

/**
 * Variant picker shown only when a product has variants. Each option carries its own price/stock;
 * the parent reads the chosen variant to drive the displayed price, stock badge, and add-to-bag.
 * Out-of-stock variants are disabled (the server is still the authority on availability).
 */
export function VariantSelector({
  variants,
  selectedId,
  onSelect,
}: {
  variants: ProductVariant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
        Choose an option
      </legend>
      <div className="mt-2.5 flex flex-wrap gap-2.5">
        {variants.map((v) => {
          const selected = v.id === selectedId;
          const soldOut = v.stock <= 0;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => !soldOut && onSelect(v.id)}
              disabled={soldOut}
              aria-pressed={selected}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                selected
                  ? 'border-brand-600 bg-brand-50 text-ink'
                  : 'border-line bg-surface text-ink-soft hover:border-faint hover:text-ink',
                soldOut && 'cursor-not-allowed text-faint line-through opacity-60 hover:border-line',
              )}
            >
              {v.color && (
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 rounded-full border border-line"
                  style={{ backgroundColor: v.color }}
                />
              )}
              {selected && <Icon name="check" size={14} className="text-brand-600 dark:text-brand-300" />}
              <span>{v.label}</span>
              {v.priceCents > 0 && <span className="text-muted">{formatPrice(v.priceCents)}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
