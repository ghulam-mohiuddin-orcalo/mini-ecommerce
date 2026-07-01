'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, fieldClasses } from '@/components/ui/Input';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/api';
import {
  useCreateProduct,
  useUpdateProduct,
  type ProductImageInput,
  type ProductInput,
  type ProductVariantInput,
} from '@/lib/hooks/useAdmin';
import { useAllAdminCategories } from '@/lib/hooks/useAdminCategories';
import { useMe } from '@/lib/hooks/useAuth';
import type { AdminProduct, Category } from '@/lib/types';

const dollarsToCents = (s: string): number => Math.round(Number(s) * 100);
const centsToDollars = (c: number): string => (c / 100).toFixed(2);

/** Local editor row shapes — money is kept as dollar strings until submit. */
interface ImageRow {
  url: string;
  alt: string;
}

interface VariantRow {
  label: string;
  color: string;
  size: string;
  priceDollars: string;
  stock: string;
  sku: string;
  isActive: boolean;
}

function imageRowsFrom(product?: AdminProduct): ImageRow[] {
  if (!product) return [];
  return product.images
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((img) => ({ url: img.url, alt: img.alt ?? '' }));
}

function variantRowsFrom(product?: AdminProduct): VariantRow[] {
  if (!product) return [];
  return product.variants
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((v) => ({
      label: v.label,
      color: v.color ?? '',
      size: v.size ?? '',
      priceDollars: centsToDollars(v.priceCents),
      stock: String(v.stock),
      sku: v.sku,
      isActive: v.isActive,
    }));
}

/** Create (no product) or edit (with product) form. SKU is immutable once created. */
export function AdminProductForm({
  product,
  onDone,
}: {
  product?: AdminProduct;
  onDone: () => void;
}) {
  const editing = Boolean(product);
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const mutation = editing ? update : create;

  const [form, setForm] = useState({
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    priceDollars: product ? centsToDollars(product.priceCents) : '',
    compareAtDollars:
      product?.compareAtPriceCents != null ? centsToDollars(product.compareAtPriceCents) : '',
    imageUrl: product?.imageUrl ?? '',
    categoryId: product?.category.id ?? '',
    stock: product ? String(product.stock) : '',
  });
  const [images, setImages] = useState<ImageRow[]>(() => imageRowsFrom(product));
  const [variants, setVariants] = useState<VariantRow[]>(() => variantRowsFrom(product));

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // --- image helpers -----------------------------------------------------------------
  const addImage = () => setImages((rows) => [...rows, { url: '', alt: '' }]);
  const removeImage = (i: number) => setImages((rows) => rows.filter((_, idx) => idx !== i));
  const setImage = (i: number, key: keyof ImageRow, value: string) =>
    setImages((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  const moveImage = (i: number, dir: -1 | 1) =>
    setImages((rows) => {
      const j = i + dir;
      if (j < 0 || j >= rows.length) return rows;
      const next = rows.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // --- variant helpers ---------------------------------------------------------------
  const addVariant = () =>
    setVariants((rows) => [
      ...rows,
      { label: '', color: '', size: '', priceDollars: '', stock: '', sku: '', isActive: true },
    ]);
  const removeVariant = (i: number) =>
    setVariants((rows) => rows.filter((_, idx) => idx !== i));
  const setVariant = (i: number, key: keyof VariantRow, value: string | boolean) =>
    setVariants((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const imagePayload: ProductImageInput[] = images
      .filter((img) => img.url.trim() !== '')
      .map((img) => ({ url: img.url.trim(), alt: img.alt.trim() || undefined }));

    const variantPayload: ProductVariantInput[] = variants.map((v, i) => ({
      label: v.label,
      color: v.color.trim() || undefined,
      size: v.size.trim() || undefined,
      priceCents: dollarsToCents(v.priceDollars),
      stock: Number(v.stock),
      sku: v.sku,
      position: i,
      isActive: v.isActive,
    }));

    const body: ProductInput = {
      name: form.name,
      description: form.description,
      priceCents: dollarsToCents(form.priceDollars),
      compareAtPriceCents:
        form.compareAtDollars.trim() === '' ? null : dollarsToCents(form.compareAtDollars),
      imageUrl: form.imageUrl,
      categoryId: form.categoryId,
      stock: Number(form.stock),
      images: imagePayload,
      variants: variantPayload,
    };

    if (editing && product) {
      update.mutate({ id: product.id, body }, { onSuccess: onDone });
    } else {
      create.mutate({ ...body, sku: form.sku }, { onSuccess: onDone });
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-[22px] shadow-[var(--shadow-summary)]"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold tracking-tight text-ink">
          {editing ? 'Edit product' : 'New product'}
        </h2>
        <button
          type="button"
          onClick={onDone}
          className="text-[13px] font-semibold text-muted transition-colors hover:text-ink"
        >
          Cancel ✕
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <Field label="Name" className="sm:col-span-2">
          <Input value={form.name} onChange={set('name')} required />
        </Field>
        <Field label="SKU">
          <Input value={form.sku} onChange={set('sku')} required disabled={editing} placeholder="TEE-010" />
        </Field>
        <Field label="Price ($)">
          <Input type="number" min={0} step="0.01" value={form.priceDollars} onChange={set('priceDollars')} required />
        </Field>
        <Field label="Compare-at ($)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.compareAtDollars}
            onChange={set('compareAtDollars')}
            placeholder="Optional “was” price"
          />
        </Field>
        <Field label="Stock">
          <Input type="number" min={0} value={form.stock} onChange={set('stock')} required />
        </Field>
        <Field label="Category" className="sm:col-span-2">
          <CategorySelect
            value={form.categoryId}
            onChange={(id) => setForm((f) => ({ ...f, categoryId: id }))}
          />
        </Field>
        <Field label="Image URL">
          <Input type="url" value={form.imageUrl} onChange={set('imageUrl')} required placeholder="https://…" />
        </Field>
        <Field label="Description" className="sm:col-span-3">
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required
            rows={3}
            className="w-full rounded-lg border border-line bg-field px-3.5 py-2.5 text-sm leading-relaxed text-ink transition placeholder:text-muted focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-brand-500/15"
          />
        </Field>
      </div>

      {/* --- Gallery images ------------------------------------------------------- */}
      <fieldset className="flex flex-col gap-3 rounded-lg border border-line-soft bg-paper-2/50 p-4">
        <div className="flex items-center justify-between">
          <legend className="text-[13px] font-bold text-ink">Gallery images</legend>
          <Button type="button" variant="secondary" size="sm" onClick={addImage}>
            <Icon name="plus" size={15} />
            Add image
          </Button>
        </div>
        {images.length === 0 ? (
          <p className="text-[13px] text-muted">No extra images. The main image URL is always shown.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {images.map((img, i) => (
              <li key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  type="url"
                  value={img.url}
                  onChange={(e) => setImage(i, 'url', e.target.value)}
                  placeholder="https://… image URL"
                  aria-label={`Image ${i + 1} URL`}
                  className="flex-1"
                />
                <Input
                  value={img.alt}
                  onChange={(e) => setImage(i, 'alt', e.target.value)}
                  placeholder="Alt text (optional)"
                  aria-label={`Image ${i + 1} alt text`}
                  className="flex-1"
                />
                <div className="flex shrink-0 items-center gap-1">
                  <IconBtn
                    label={`Move image ${i + 1} up`}
                    icon="chevron-up"
                    onClick={() => moveImage(i, -1)}
                    disabled={i === 0}
                  />
                  <IconBtn
                    label={`Move image ${i + 1} down`}
                    icon="chevron-down"
                    onClick={() => moveImage(i, 1)}
                    disabled={i === images.length - 1}
                  />
                  <IconBtn
                    label={`Remove image ${i + 1}`}
                    icon="trash"
                    tone="danger"
                    onClick={() => removeImage(i)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {/* --- Variants ------------------------------------------------------------- */}
      <fieldset className="flex flex-col gap-3 rounded-lg border border-line-soft bg-paper-2/50 p-4">
        <div className="flex items-center justify-between">
          <legend className="text-[13px] font-bold text-ink">Variants</legend>
          <Button type="button" variant="secondary" size="sm" onClick={addVariant}>
            <Icon name="plus" size={15} />
            Add variant
          </Button>
        </div>
        {variants.length === 0 ? (
          <p className="text-[13px] text-muted">
            No variants. Saving replaces all existing variants with this list.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {variants.map((v, i) => (
              <li
                key={i}
                className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface p-3 sm:grid-cols-12"
              >
                <Input
                  value={v.label}
                  onChange={(e) => setVariant(i, 'label', e.target.value)}
                  placeholder="Label"
                  aria-label={`Variant ${i + 1} label`}
                  required
                  className="col-span-2 sm:col-span-3"
                />
                <Input
                  value={v.sku}
                  onChange={(e) => setVariant(i, 'sku', e.target.value)}
                  placeholder="SKU"
                  aria-label={`Variant ${i + 1} SKU`}
                  required
                  className="col-span-2 sm:col-span-3"
                />
                <Input
                  value={v.color}
                  onChange={(e) => setVariant(i, 'color', e.target.value)}
                  placeholder="Color"
                  aria-label={`Variant ${i + 1} color`}
                  className="sm:col-span-2"
                />
                <Input
                  value={v.size}
                  onChange={(e) => setVariant(i, 'size', e.target.value)}
                  placeholder="Size"
                  aria-label={`Variant ${i + 1} size`}
                  className="sm:col-span-1"
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={v.priceDollars}
                  onChange={(e) => setVariant(i, 'priceDollars', e.target.value)}
                  placeholder="Price $"
                  aria-label={`Variant ${i + 1} price in dollars`}
                  required
                  className="sm:col-span-2"
                />
                <Input
                  type="number"
                  min={0}
                  value={v.stock}
                  onChange={(e) => setVariant(i, 'stock', e.target.value)}
                  placeholder="Stock"
                  aria-label={`Variant ${i + 1} stock`}
                  required
                  className="sm:col-span-1"
                />
                <div className="col-span-2 flex items-center justify-between sm:col-span-12">
                  <label className="flex items-center gap-2 text-[13px] font-semibold text-ink-soft">
                    <input
                      type="checkbox"
                      checked={v.isActive}
                      onChange={(e) => setVariant(i, 'isActive', e.target.checked)}
                      className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
                    />
                    Active
                  </label>
                  <IconBtn
                    label={`Remove variant ${i + 1}`}
                    icon="trash"
                    tone="danger"
                    onClick={() => removeVariant(i)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {mutation.isError && (
        <p role="alert" className="text-sm text-[color:var(--color-danger)]">
          {mutation.error instanceof ApiError ? mutation.error.message : 'Save failed'}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Searchable, keyboard-accessible category picker. Admins may only choose an existing
 * category (no free-text). Selection is submitted as `categoryId`. A visually-hidden
 * `required` input mirrors the chosen id so native form validation blocks empty submits.
 */
function CategorySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { data: user } = useMe();
  const { data: categories = [], isLoading } = useAllAdminCategories(user?.role === 'ADMIN');

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = useMemo(
    () => categories.find((c) => c.id === value) ?? null,
    [categories, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const commit = (category: Category) => {
    onChange(category.id);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[activeIndex]) {
        e.preventDefault();
        commit(filtered[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const displayText = open ? query : selected?.name ?? '';

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={isLoading ? 'Loading categories…' : 'Search categories…'}
        value={displayText}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={cn(fieldClasses, 'cursor-text')}
      />
      {/* Mirrors the chosen id so the native `required` gate blocks an empty submit. */}
      <input
        type="text"
        required
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={() => undefined}
        className="pointer-events-none absolute bottom-0 left-3 h-0 w-px opacity-0"
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-surface p-1 shadow-soft"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">
              {isLoading ? 'Loading…' : 'No categories found'}
            </li>
          ) : (
            filtered.map((c, i) => {
              const isSelected = c.id === value;
              const isActive = i === activeIndex;
              return (
                <li
                  key={c.id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(c);
                  }}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm',
                    isActive ? 'bg-brand-50 text-ink' : 'text-ink-soft',
                    !c.isActive && 'opacity-60',
                  )}
                >
                  <span className="font-semibold">{c.name}</span>
                  {!c.isActive && <span className="text-[11px] text-muted">Inactive</span>}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

function IconBtn({
  label,
  icon,
  onClick,
  disabled,
  tone = 'neutral',
}: {
  label: string;
  icon: 'chevron-up' | 'chevron-down' | 'trash';
  onClick: () => void;
  disabled?: boolean;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        tone === 'danger'
          ? 'text-muted hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger-ink)]'
          : 'text-ink-soft hover:bg-paper-2 hover:text-ink',
      )}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className ?? ''}`}>
      <span className="font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}
