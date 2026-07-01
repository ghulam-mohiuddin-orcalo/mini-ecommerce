'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/api';
import {
  useCreateCategory,
  useUpdateCategory,
} from '@/lib/hooks/useAdminCategories';
import type { Category, CreateCategoryInput } from '@/lib/types';

const textareaClasses =
  'w-full rounded-lg border border-line bg-field px-3.5 py-2.5 text-sm leading-relaxed text-ink transition placeholder:text-muted focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-brand-500/15';

/** Client-side slugify — mirrors the backend derivation (lowercase, hyphenated, ASCII-ish). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Create (no category) or edit (with category) form. Used from the admin categories page. */
export function AdminCategoryForm({
  category,
  onDone,
}: {
  category?: Category;
  onDone: () => void;
}) {
  const editing = Boolean(category);
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const mutation = editing ? update : create;

  const [form, setForm] = useState({
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    description: category?.description ?? '',
    imageUrl: category?.imageUrl ?? '',
    sortOrder: category ? String(category.sortOrder) : '0',
    isActive: category ? category.isActive : true,
  });
  // Once the user edits the slug directly, stop auto-deriving it from the name.
  const [slugTouched, setSlugTouched] = useState(Boolean(category?.slug));

  const onNameChange = (value: string) =>
    setForm((f) => ({
      ...f,
      name: value,
      slug: slugTouched ? f.slug : slugify(value),
    }));

  const onSlugChange = (value: string) => {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug: value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSort = Number(form.sortOrder);
    const body: CreateCategoryInput = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      sortOrder: Number.isFinite(parsedSort) ? parsedSort : 0,
      isActive: form.isActive,
    };

    if (editing && category) {
      update.mutate({ id: category.id, body }, { onSuccess: onDone });
    } else {
      create.mutate(body, { onSuccess: onDone });
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-[22px] shadow-[var(--shadow-summary)]"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold tracking-tight text-ink">
          {editing ? 'Edit category' : 'New category'}
        </h2>
        <button
          type="button"
          onClick={onDone}
          className="text-[13px] font-semibold text-muted transition-colors hover:text-ink"
        >
          Cancel ✕
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => onNameChange(e.target.value)} required />
        </Field>
        <Field label="Slug">
          <Input
            value={form.slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="auto-generated from name"
          />
        </Field>
        <Field label="Image URL">
          <Input
            type="url"
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="https://… (optional)"
          />
        </Field>
        <Field label="Sort order">
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            placeholder="0"
          />
        </Field>
        <Field label="Status">
          <Select
            value={form.isActive ? 'active' : 'inactive'}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'active' }))}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className={textareaClasses}
            placeholder="Short blurb shown on the storefront (optional)"
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
          {mutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create category'}
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
    <label className={cn('flex flex-col gap-1.5 text-sm', className)}>
      <span className="font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}
