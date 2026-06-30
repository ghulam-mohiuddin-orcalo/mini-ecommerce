'use client';

import { useEffect } from 'react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useContent } from '@/lib/hooks/useSiteContent';
import { formatDate } from '@/lib/format';
import { Prose } from './Prose';

/**
 * Shared renderer for a single CMS content block (policy pages + about). All copy comes from
 * the `useContent(key)` block — nothing here is hardcoded beyond loading/empty/error fallbacks.
 */
export function ContentPage({
  contentKey,
  breadcrumbLabel,
  eyebrow,
}: {
  contentKey: string;
  breadcrumbLabel: string;
  eyebrow: string;
}) {
  const { data, isLoading, isError, refetch } = useContent(contentKey);

  // Keep the document title in sync with the loaded CMS block (basic SEO for a client page).
  useEffect(() => {
    if (data?.title) document.title = `${data.title} — Pine & Parcel`;
  }, [data?.title]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <Breadcrumbs
        className="mb-8"
        items={[{ label: 'Home', href: '/' }, { label: breadcrumbLabel }]}
      />

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data ? (
        <EmptyState
          title="Nothing to show yet"
          description="This page hasn’t been published. Please check back soon."
        />
      ) : (
        <article className="pp-rise">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-brand-500 dark:text-brand-300">
            {eyebrow}
          </span>
          <h1 className="mt-5 font-serif text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl">
            {data.title}
          </h1>
          <p className="mt-3 text-sm text-muted">Last updated {formatDate(data.updatedAt)}</p>
          <div className="mt-8">
            <Prose body={data.body} />
          </div>
        </article>
      )}
    </div>
  );
}
