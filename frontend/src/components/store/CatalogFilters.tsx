'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { ProductQuery } from '@/lib/types';

const centsToDollars = (cents?: number): string =>
  cents === undefined ? '' : String(cents / 100);

const dollarsToCents = (dollars: string): number | undefined => {
  const trimmed = dollars.trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  if (Number.isNaN(n) || n < 0) return undefined;
  return Math.round(n * 100);
};

export function CatalogFilters({
  value,
  categories,
  onChange,
  onClear,
  hasActiveFilters,
}: {
  value: ProductQuery;
  categories: string[];
  onChange: (partial: Partial<ProductQuery>) => void;
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

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-extrabold tracking-tight text-ink">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-xs font-semibold text-[var(--color-danger)] transition-colors hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="search" className="sr-only">
          Search
        </label>
        <Input
          id="search"
          ref={searchRef}
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="category" className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          Category
        </label>
        <Select
          id="category"
          value={value.category ?? ''}
          onChange={(e) => onChange({ category: e.target.value || undefined })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

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
    </div>
  );
}
