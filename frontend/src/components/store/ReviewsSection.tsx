'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Rating } from '@/components/ui/Rating';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Pagination } from '@/components/store/Pagination';
import { WriteReviewForm } from '@/components/store/WriteReviewForm';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useMe } from '@/lib/hooks/useAuth';
import { useDeleteReview, useReviews } from '@/lib/hooks/useReviews';
import type { Review } from '@/lib/types';

const PAGE_SIZE = 5;

export function ReviewsSection({
  productId,
  ratingAvg,
  ratingCount,
}: {
  productId: string;
  ratingAvg: number;
  ratingCount: number;
}) {
  const { data: user } = useMe();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch, isFetching } = useReviews(productId, page, PAGE_SIZE);
  const deleteReview = useDeleteReview(productId);
  const { toast } = useToast();

  const reviews = data?.data ?? [];
  const meta = data?.meta;

  function onDelete(review: Review) {
    deleteReview.mutate(review.id, {
      onSuccess: () => toast({ variant: 'success', title: 'Review deleted' }),
      onError: () => toast({ variant: 'error', title: 'Could not delete review' }),
    });
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-5" aria-busy={isFetching}>
        <div className="flex items-center gap-4">
          <span className="font-serif text-4xl font-medium tracking-tight text-ink">
            {ratingAvg.toFixed(1)}
          </span>
          <div className="flex flex-col gap-0.5">
            <Rating value={ratingAvg} size="md" />
            <span className="text-sm text-muted">
              {ratingCount} review{ratingCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : reviews.length === 0 ? (
          <EmptyState
            title="No reviews yet"
            description="Be the first to share your experience with this product."
          />
        ) : (
          <>
            <ul className="flex flex-col gap-4">
              {reviews.map((review) => {
                const mine = Boolean(user && review.userName === user.name);
                return (
                  <li
                    key={review.id}
                    className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <Rating value={review.rating} size="sm" />
                        {review.title && (
                          <p className="font-bold tracking-tight text-ink">{review.title}</p>
                        )}
                      </div>
                      {mine && (
                        <button
                          type="button"
                          onClick={() => onDelete(review)}
                          disabled={deleteReview.isPending}
                          aria-label="Delete your review"
                          className={cn(
                            'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors',
                            'hover:bg-paper-2 hover:text-[color:var(--color-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                          )}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-ink-soft">{review.body}</p>
                    <p className="text-xs text-muted">
                      {review.userName} · {formatDate(review.createdAt)}
                      {mine && <span className="ml-1.5 font-semibold text-brand-600 dark:text-brand-300">(you)</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
            {meta && (
              <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
            )}
          </>
        )}
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        {user ? (
          <WriteReviewForm productId={productId} />
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 text-center shadow-[var(--shadow-card)]">
            <p className="text-sm text-ink-soft">Purchased this product? Sign in to leave a review.</p>
            <Link href="/login">
              <Button variant="secondary" className="w-full">
                Sign in
              </Button>
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
