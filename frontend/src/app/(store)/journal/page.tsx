'use client';

import { Suspense, useCallback, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArticleCard } from '@/components/store/ArticleCard';
import { Container } from '@/components/store/Container';
import { Pagination } from '@/components/store/Pagination';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useArticleCategories, useArticles } from '@/lib/hooks/useArticles';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 9;

function JournalClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? undefined;
  const pageRaw = Number(searchParams.get('page'));
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const { data, isLoading, isError, isFetching, refetch } = useArticles({
    search: search || undefined,
    category,
    page,
    pageSize: PAGE_SIZE,
  });
  const { data: categories = [] } = useArticleCategories();

  const [searchInput, setSearchInput] = useState(search);

  const writeParams = useCallback(
    (next: { search?: string; category?: string; page?: number }) => {
      const usp = new URLSearchParams();
      if (next.search) usp.set('search', next.search);
      if (next.category) usp.set('category', next.category);
      if (next.page && next.page > 1) usp.set('page', String(next.page));
      const qs = usp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const onSearchSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      writeParams({ search: searchInput.trim(), category, page: 1 });
    },
    [searchInput, category, writeParams],
  );

  const setCategory = useCallback(
    (slug: string | undefined) => writeParams({ search: search || undefined, category: slug, page: 1 }),
    [search, writeParams],
  );

  const setPage = useCallback(
    (next: number) => writeParams({ search: search || undefined, category, page: next }),
    [search, category, writeParams],
  );

  const meta = data?.meta;
  const articles = data?.data ?? [];
  const hasFilters = Boolean(search || category);

  return (
    <Container className="py-14 sm:py-16">
      <header className="pp-rise max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-brand-500 dark:text-brand-300">
          The Journal
        </span>
        <h1 className="mt-5 font-serif text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl">
          Notes from the shelf
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">
          Stories, guides, and the thinking behind the things we keep.
        </p>
      </header>

      <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter articles by category">
          <button
            type="button"
            onClick={() => setCategory(undefined)}
            aria-pressed={!category}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
              !category
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-line bg-surface text-ink-soft hover:border-faint hover:text-ink',
            )}
          >
            All
          </button>
          {categories.map((c) => {
            const active = category === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => setCategory(c.slug)}
                aria-pressed={active}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
                  active
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-line bg-surface text-ink-soft hover:border-faint hover:text-ink',
                )}
              >
                {c.name}
                <span className={cn('ml-1.5 text-xs', active ? 'text-white/70' : 'text-faint')}>
                  {c.articleCount}
                </span>
              </button>
            );
          })}
        </div>

        <form onSubmit={onSearchSubmit} className="relative w-full sm:w-72" role="search">
          <label htmlFor="journal-search" className="sr-only">
            Search articles
          </label>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Icon name="search" size={16} />
          </span>
          <Input
            id="journal-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search the journal"
            className="pl-9"
          />
        </form>
      </div>

      <section className="mt-10" aria-busy={isFetching}>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-line bg-surface">
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
                <div className="flex flex-col gap-2 p-5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : articles.length === 0 ? (
          <EmptyState
            title="No articles found"
            description={
              hasFilters
                ? 'Nothing matches these filters yet. Try another category or clear your search.'
                : 'There are no published articles just yet — check back soon.'
            }
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchInput('');
                    writeParams({});
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-10">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
            {meta && (
              <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
            )}
          </div>
        )}
      </section>
    </Container>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={<Container className="py-14 sm:py-16" />}>
      <JournalClient />
    </Suspense>
  );
}
