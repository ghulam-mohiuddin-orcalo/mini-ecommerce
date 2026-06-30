'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { Pagination } from '@/components/store/Pagination';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useMe } from '@/lib/hooks/useAuth';
import {
  useAdminArticle,
  useAdminArticleCategories,
  useAdminArticles,
  useCreateArticle,
  useCreateArticleCategory,
  useDeleteArticle,
  useSetArticlePublished,
  useUpdateArticle,
  type AdminArticleListItem,
  type AdminArticleStatus,
  type ArticleInput,
} from '@/lib/hooks/useAdminArticles';

const STATUS_OPTIONS: { value: '' | AdminArticleStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Drafts' },
];

const textareaClasses =
  'w-full rounded-lg border border-line bg-field px-3.5 py-2.5 text-sm leading-relaxed text-ink transition placeholder:text-muted focus:border-brand-500 focus:bg-surface focus:outline-none focus:ring-[3px] focus:ring-brand-500/15';

export default function AdminArticlesPage() {
  const { data: user } = useMe();
  const isAdmin = user?.role === 'ADMIN';
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | AdminArticleStatus>('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = useAdminArticles(
    { search: debouncedSearch || undefined, status, page },
    isAdmin,
  );
  const { data: categories } = useAdminArticleCategories(isAdmin);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const closeForm = () => {
    setEditingId(null);
    setCreating(false);
  };

  const publish = useSetArticlePublished();
  const remove = useDeleteArticle();

  const onTogglePublish = (a: AdminArticleListItem) => {
    const next = a.status !== 'PUBLISHED';
    publish.mutate(
      { id: a.id, published: next },
      {
        onSuccess: () =>
          toast({ variant: 'success', title: next ? 'Article published' : 'Moved to draft' }),
        onError: (e) =>
          toast({
            variant: 'error',
            title: 'Action failed',
            description: e instanceof ApiError ? e.message : undefined,
          }),
      },
    );
  };

  const onDelete = (a: AdminArticleListItem) => {
    if (!window.confirm(`Delete “${a.title}”? This cannot be undone.`)) return;
    remove.mutate(a.id, {
      onSuccess: () => toast({ variant: 'success', title: 'Article deleted' }),
      onError: (e) =>
        toast({
          variant: 'error',
          title: 'Delete failed',
          description: e instanceof ApiError ? e.message : undefined,
        }),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">Articles</h1>
          {data?.meta && (
            <p className="mt-1 text-[13px] text-muted">
              {data.meta.total} article{data.meta.total === 1 ? '' : 's'}
            </p>
          )}
        </div>
        {!creating && !editingId && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowCategory(true)}>
              New category
            </Button>
            <Button onClick={() => setCreating(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New article
            </Button>
          </div>
        )}
      </div>

      {(creating || editingId) && (
        <ArticleForm
          articleId={editingId}
          categories={categories ?? []}
          isAdmin={isAdmin}
          onDone={closeForm}
        />
      )}

      {showCategory && (
        <CategoryForm onClose={() => setShowCategory(false)} />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Search articles…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as '' | AdminArticleStatus);
            setPage(1);
          }}
          aria-label="Filter by status"
          className="max-w-[180px]"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.data.length === 0 ? (
        <EmptyState title="No articles" description="No articles match the current filters." />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-2 text-left text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
                  <th className="px-[18px] py-3 font-bold">Title</th>
                  <th className="px-[18px] py-3 font-bold">Category</th>
                  <th className="px-[18px] py-3 font-bold">Author</th>
                  <th className="px-[18px] py-3 font-bold">Status</th>
                  <th className="px-[18px] py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line-soft)]">
                {data.data.map((a) => (
                  <tr key={a.id} className="align-top transition-colors hover:bg-paper-2">
                    <td className="px-[18px] py-3">
                      <div className="font-bold text-ink">{a.title}</div>
                      <div className="text-xs text-muted">
                        {a.publishedAt ? `Published ${formatDate(a.publishedAt)}` : 'Not published'}
                      </div>
                    </td>
                    <td className="px-[18px] py-3 text-ink-soft">{a.category?.name ?? '—'}</td>
                    <td className="px-[18px] py-3 text-ink-soft">{a.author}</td>
                    <td className="px-[18px] py-3">
                      <Badge tone={a.status === 'PUBLISHED' ? 'brand' : 'neutral'} dot>
                        {a.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-[18px] py-3">
                      <div className="flex justify-end gap-3.5 font-semibold">
                        <button
                          onClick={() => {
                            setEditingId(a.id);
                            setCreating(false);
                          }}
                          className="text-brand-600 dark:text-brand-300 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onTogglePublish(a)}
                          disabled={publish.isPending}
                          className="text-muted hover:text-ink"
                        >
                          {a.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => onDelete(a)}
                          disabled={remove.isPending}
                          className="text-[color:var(--color-danger)] hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.meta.totalPages > 1 && (
            <Pagination page={data.meta.page} totalPages={data.meta.totalPages} onPageChange={setPage} />
          )}
        </div>
      )}
    </div>
  );
}

function ArticleForm({
  articleId,
  categories,
  isAdmin,
  onDone,
}: {
  articleId: string | null;
  categories: { id: string; name: string }[];
  isAdmin: boolean;
  onDone: () => void;
}) {
  const editing = Boolean(articleId);
  const { toast } = useToast();
  const { data: existing, isLoading } = useAdminArticle(articleId, isAdmin);
  const create = useCreateArticle();
  const update = useUpdateArticle();
  const mutation = editing ? update : create;

  if (editing && isLoading) {
    return <Skeleton className="h-80 w-full" />;
  }

  return (
    <ArticleFormBody
      key={existing?.id ?? 'new'}
      initial={existing ?? null}
      categories={categories}
      saving={mutation.isPending}
      error={mutation.error instanceof ApiError ? mutation.error.message : null}
      onCancel={onDone}
      onSubmit={(body) => {
        if (editing && articleId) {
          update.mutate(
            { id: articleId, body },
            {
              onSuccess: () => {
                toast({ variant: 'success', title: 'Article saved' });
                onDone();
              },
            },
          );
        } else {
          create.mutate(body, {
            onSuccess: () => {
              toast({ variant: 'success', title: 'Article created' });
              onDone();
            },
          });
        }
      }}
    />
  );
}

function ArticleFormBody({
  initial,
  categories,
  saving,
  error,
  onCancel,
  onSubmit,
}: {
  initial: {
    title: string;
    excerpt: string;
    body: string;
    coverUrl: string;
    author: string;
    slug: string;
    categoryId: string | null;
    status: AdminArticleStatus;
  } | null;
  categories: { id: string; name: string }[];
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (body: ArticleInput) => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    excerpt: initial?.excerpt ?? '',
    body: initial?.body ?? '',
    coverUrl: initial?.coverUrl ?? '',
    author: initial?.author ?? '',
    slug: initial?.slug ?? '',
    categoryId: initial?.categoryId ?? '',
    status: initial?.status ?? ('DRAFT' as AdminArticleStatus),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: form.title,
      excerpt: form.excerpt,
      body: form.body,
      coverUrl: form.coverUrl,
      author: form.author,
      slug: form.slug.trim() || undefined,
      categoryId: form.categoryId || null,
      status: form.status,
    });
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-[22px] shadow-[var(--shadow-summary)]"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold tracking-tight text-ink">
          {initial ? 'Edit article' : 'New article'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-[13px] font-semibold text-muted transition-colors hover:text-ink"
        >
          Cancel ✕
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <ArticleField label="Title" className="sm:col-span-2">
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
        </ArticleField>
        <ArticleField label="Author">
          <Input value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} required />
        </ArticleField>
        <ArticleField label="Slug (optional)">
          <Input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="auto-generated if blank"
          />
        </ArticleField>
        <ArticleField label="Category">
          <Select
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </ArticleField>
        <ArticleField label="Status">
          <Select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AdminArticleStatus }))}
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </Select>
        </ArticleField>
        <ArticleField label="Cover image URL" className="sm:col-span-2">
          <Input
            type="url"
            value={form.coverUrl}
            onChange={(e) => setForm((f) => ({ ...f, coverUrl: e.target.value }))}
            required
            placeholder="https://…"
          />
        </ArticleField>
        <ArticleField label="Excerpt" className="sm:col-span-2">
          <textarea
            value={form.excerpt}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            required
            rows={2}
            className={textareaClasses}
          />
        </ArticleField>
        <ArticleField label="Body" className="sm:col-span-2">
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            required
            rows={8}
            className={textareaClasses}
          />
        </ArticleField>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[color:var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Create article'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CategoryForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const create = useCreateArticleCategory();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { name, slug: slug.trim() || undefined },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: 'Category created' });
          onClose();
        },
        onError: (err) =>
          toast({
            variant: 'error',
            title: 'Create failed',
            description: err instanceof ApiError ? err.message : undefined,
          }),
      },
    );
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-[22px] shadow-[var(--shadow-summary)]"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold tracking-tight text-ink">New article category</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-[13px] font-semibold text-muted transition-colors hover:text-ink"
        >
          Cancel ✕
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <ArticleField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </ArticleField>
        <ArticleField label="Slug (optional)">
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto if blank" />
        </ArticleField>
      </div>
      {create.isError && (
        <p role="alert" className="text-sm text-[color:var(--color-danger)]">
          {create.error instanceof ApiError ? create.error.message : 'Create failed'}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Saving…' : 'Create category'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ArticleField({
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
