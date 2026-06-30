import Link from 'next/link';
import { formatDate } from '@/lib/format';
import type { ArticleListItem } from '@/lib/types';

/** Journal article preview card — cover image, category, title, excerpt, author + date. */
export function ArticleCard({ article }: { article: ArticleListItem }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link
        href={`/journal/${article.slug}`}
        className="flex flex-1 flex-col rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.coverUrl}
            alt={article.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
          />
        </div>

        <div className="flex flex-1 flex-col gap-2 p-5">
          {article.category && (
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-brand-600 dark:text-brand-300">
              {article.category.name}
            </span>
          )}
          <h3 className="font-serif text-lg font-medium leading-snug tracking-tight text-ink">
            {article.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-ink-soft">{article.excerpt}</p>
          <p className="mt-auto pt-3 text-xs text-muted">
            <span className="font-semibold text-ink-soft">{article.author}</span>
            {article.publishedAt && (
              <>
                {' · '}
                <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
              </>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}
