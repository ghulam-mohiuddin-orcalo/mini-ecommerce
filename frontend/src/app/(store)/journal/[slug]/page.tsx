'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArticleCard } from '@/components/store/ArticleCard';
import { Container } from '@/components/store/Container';
import { Prose } from '@/components/store/Prose';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { ApiError } from '@/lib/api';
import { useArticle, useRelatedArticles } from '@/lib/hooks/useArticles';
import { formatDate } from '@/lib/format';

export default function ArticleDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: article, isLoading, isError, error, refetch } = useArticle(slug);
  const { data: related = [] } = useRelatedArticles(slug);

  const notFound = isError && error instanceof ApiError && error.status === 404;

  // Sync the document title to the loaded article (basic SEO for a client page).
  useEffect(() => {
    if (article?.title) document.title = `${article.title} — Verdant`;
  }, [article?.title]);

  return (
    <Container width="narrow" className="py-12 sm:py-16">
      {isLoading ? (
        <div className="flex flex-col gap-5">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 aspect-[16/9] w-full rounded-2xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : notFound ? (
        <EmptyState
          title="Article not found"
          description="This story may have been moved or unpublished."
          action={
            <Link href="/journal">
              <Button variant="secondary">Back to the Journal</Button>
            </Link>
          }
        />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : article ? (
        <>
          <Breadcrumbs
            className="mb-7"
            items={[
              { label: 'Home', href: '/' },
              { label: 'Journal', href: '/journal' },
              { label: article.title },
            ]}
          />

          <article className="pp-rise">
            <header>
              {article.category && (
                <Link
                  href={`/journal?category=${encodeURIComponent(article.category.slug)}`}
                  className="text-xs font-bold uppercase tracking-[0.06em] text-brand-600 transition-colors hover:underline dark:text-brand-300"
                >
                  {article.category.name}
                </Link>
              )}
              <h1 className="mt-3 font-serif text-4xl font-medium leading-[1.1] tracking-tight text-ink sm:text-5xl">
                {article.title}
              </h1>
              <p className="mt-4 text-sm text-muted">
                <span className="font-semibold text-ink-soft">{article.author}</span>
                {article.publishedAt && (
                  <>
                    {' · '}
                    <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                  </>
                )}
              </p>
            </header>

            <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-brand-50 to-brand-100 shadow-[var(--shadow-card)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.coverUrl}
                alt={article.title}
                decoding="async"
                className="aspect-[16/9] w-full object-cover"
              />
            </div>

            {article.excerpt && (
              <p className="mt-8 font-serif text-xl leading-relaxed text-ink">{article.excerpt}</p>
            )}

            <div className="mt-6">
              <Prose body={article.body} />
            </div>
          </article>

          {related.length > 0 && (
            <section className="mt-16 border-t border-line pt-12">
              <h2 className="font-serif text-2xl font-medium tracking-tight text-ink">
                Related reading
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <ArticleCard key={item.id} article={item} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : null}
    </Container>
  );
}

