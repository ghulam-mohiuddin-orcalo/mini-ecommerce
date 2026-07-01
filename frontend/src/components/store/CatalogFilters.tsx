'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Rating } from '@/components/ui/Rating';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { Category, ProductQuery } from '@/lib/types';

const centsToDollars = (cents?: number): string =>
  cents === undefined ? '' : String(cents / 100);

const dollarsToCents = (dollars: string): number | undefined => {
  const trimmed = dollars.trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  if (Number.isNaN(n) || n < 0) return undefined;
  return Math.round(n * 100);
};

const RATING_THRESHOLDS = [4, 3, 2, 1] as const;

/**
 * Catalog sidebar filters. Category / price / search drive the server `ProductQuery`. The rating
 * threshold (`minRating`) is intentionally a CLIENT-SIDE filter applied by the catalog page to the
 * returned page of products — the API has no rating filter param, so we narrow what came back.
 */
export function CatalogFilters({
  value,
  categories,
  minRating,
  onChange,
  onRatingChange,
  onClear,
  hasActiveFilters,
}: {
  value: ProductQuery;
  categories: Category[];
  minRating: number | undefined;
  onChange: (partial: Partial<ProductQuery>) => void;
  onRatingChange: (rating: number | undefined) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}) {
  const [search, setSearch] = useState(value.search ?? '');
  const [minDollars, setMinDollars] = useState(centsToDollars(value.minPrice));
  const [maxDollars, setMaxDollars] = useState(centsToDollars(value.maxPrice));

  const searchRef = useRef<HTMLInputElement>(null);
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(search, 350);
  const debouncedMin = useDebounce(minDollars, 500);
  const debouncedMax = useDebounce(maxDollars, 500);

  // Push debounced local edits up to the URL — but only when they actually differ, to avoid
  // redundant navigations and update loops.
  useEffect(() => {
    const next = debouncedSearch.trim() || undefined;
    if (next !== value.search) onChange({ search: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    const next = dollarsToCents(debouncedMin);
    if (next !== value.minPrice) onChange({ minPrice: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMin]);

  useEffect(() => {
    const next = dollarsToCents(debouncedMax);
    if (next !== value.maxPrice) onChange({ maxPrice: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMax]);

  // Resync local inputs when the URL changes externally (Clear, back-navigation) — but never
  // while the field is focused, so it doesn't fight the user's typing.
  useEffect(() => {
    if (document.activeElement !== searchRef.current) setSearch(value.search ?? '');
  }, [value.search]);
  useEffect(() => {
    if (document.activeElement !== minRef.current) setMinDollars(centsToDollars(value.minPrice));
  }, [value.minPrice]);
  useEffect(() => {
    if (document.activeElement !== maxRef.current) setMaxDollars(centsToDollars(value.maxPrice));
  }, [value.maxPrice]);

  // Filter value is the category slug; display the human-readable name where we can resolve it.
  const categoryName = (slug: string): string =>
    categories.find((c) => c.slug === slug)?.name ?? slug;

  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (value.search) chips.push({ key: 'search', label: `“${value.search}”`, onRemove: () => onChange({ search: undefined }) });
  if (value.category) chips.push({ key: 'category', label: categoryName(value.category), onRemove: () => onChange({ category: undefined }) });
  if (value.minPrice !== undefined)
    chips.push({ key: 'min', label: `≥ ${formatPrice(value.minPrice)}`, onRemove: () => onChange({ minPrice: undefined }) });
  if (value.maxPrice !== undefined)
    chips.push({ key: 'max', label: `≤ ${formatPrice(value.maxPrice)}`, onRemove: () => onChange({ maxPrice: undefined }) });
  if (minRating !== undefined)
    chips.push({ key: 'rating', label: `${minRating}★ & up`, onRemove: () => onRatingChange(undefined) });

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-extrabold tracking-tight text-ink">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-xs font-semibold text-[var(--color-danger)] transition-colors hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-200 dark:text-brand-300"
            >
              {chip.label}
              <Icon name="x" size={12} />
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="search" className="sr-only">
          Search
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Icon name="search" size={16} />
          </span>
          <Input
            id="search"
            ref={searchRef}
            type="search"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          Category
        </legend>
        <ul className="flex flex-col gap-0.5">
          <li>
            <button
              onClick={() => onChange({ category: undefined })}
              aria-pressed={!value.category}
              className={cn(
                'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                !value.category
                  ? 'bg-brand-50 text-brand-700 dark:text-brand-300'
                  : 'text-ink-soft hover:bg-paper-2 hover:text-ink',
              )}
            >
              All categories
            </button>
          </li>
          {categories.map((c) => {
            const active = value.category === c.slug;
            return (
              <li key={c.id}>
                <button
                  onClick={() => onChange({ category: active ? undefined : c.slug })}
                  aria-pressed={active}
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                    active
                      ? 'bg-brand-50 text-brand-700 dark:text-brand-300'
                      : 'text-ink-soft hover:bg-paper-2 hover:text-ink',
                  )}
                >
                  {c.name}
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          Price range
        </legend>
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted">Min</span>
            <Input
              ref={minRef}
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="$0"
              aria-label="Minimum price in dollars"
              value={minDollars}
              onChange={(e) => setMinDollars(e.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted">Max</span>
            <Input
              ref={maxRef}
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="Any"
              aria-label="Maximum price in dollars"
              value={maxDollars}
              onChange={(e) => setMaxDollars(e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          Customer rating
        </legend>
        <ul className="flex flex-col gap-0.5">
          {RATING_THRESHOLDS.map((threshold) => {
            const active = minRating === threshold;
            return (
              <li key={threshold}>
                <button
                  onClick={() => onRatingChange(active ? undefined : threshold)}
                  aria-pressed={active}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors',
                    active ? 'bg-brand-50 text-ink' : 'text-ink-soft hover:bg-paper-2 hover:text-ink',
                  )}
                >
                  <Rating value={threshold} size="sm" />
                  <span>&amp; up</span>
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </div>
  );
}
