'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { useCreateProduct, useUpdateProduct, type ProductInput } from '@/lib/hooks/useAdmin';
import type { AdminProduct } from '@/lib/types';

const dollarsToCents = (s: string): number => Math.round(Number(s) * 100);
const centsToDollars = (c: number): string => (c / 100).toFixed(2);

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
    imageUrl: product?.imageUrl ?? '',
    category: product?.category ?? '',
    stock: product ? String(product.stock) : '',
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: ProductInput = {
      name: form.name,
      description: form.description,
      priceCents: dollarsToCents(form.priceDollars),
      imageUrl: form.imageUrl,
      category: form.category,
      stock: Number(form.stock),
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
        <Field label="Stock">
          <Input type="number" min={0} value={form.stock} onChange={set('stock')} required />
        </Field>
        <Field label="Category">
          <Input value={form.category} onChange={set('category')} required />
        </Field>
        <Field label="Image URL" className="sm:col-span-3">
          <Input type="url" value={form.imageUrl} onChange={set('imageUrl')} required placeholder="https://…" />
        </Field>
        <Field label="Description" className="sm:col-span-3">
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required
            rows={3}
            className="w-full rounded-lg border border-[#d9d3c8] bg-field px-3.5 py-2.5 text-sm leading-relaxed text-ink transition placeholder:text-muted focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-brand-500/15"
          />
        </Field>
      </div>

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
