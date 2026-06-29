'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { ProductQuery, ProductSort } from '@/lib/types';

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="search" className="text-sm font-medium text-ink">
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm font-medium text-ink">
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

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-ink">Price range ($)</legend>
        <div className="flex items-center gap-2">
          <Input
            ref={minRef}
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="Min"
            aria-label="Minimum price in dollars"
            value={minDollars}
            onChange={(e) => setMinDollars(e.target.value)}
          />
          <span className="text-muted">–</span>
          <Input
            ref={maxRef}
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="Max"
            aria-label="Maximum price in dollars"
            value={maxDollars}
            onChange={(e) => setMaxDollars(e.target.value)}
          />
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="sort" className="text-sm font-medium text-ink">
          Sort by
        </label>
        <Select
          id="sort"
          value={value.sort ?? 'newest'}
          onChange={(e) => onChange({ sort: e.target.value as ProductSort })}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="self-start">
          Clear filters
        </Button>
      )}
    </div>
  );
}
