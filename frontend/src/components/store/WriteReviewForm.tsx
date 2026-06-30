'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Rating } from '@/components/ui/Rating';
import { useToast } from '@/components/ui/Toast';
import { fieldClasses } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/api';
import { useCreateReview } from '@/lib/hooks/useReviews';

/**
 * Write-a-review form. Eligibility (verified purchaser) is enforced server-side; a 403 surfaces
 * as a friendly inline message rather than a raw error. On 201 we toast and the hook refreshes
 * the reviews list + the product aggregate.
 */
export function WriteReviewForm({ productId }: { productId: string }) {
  const { toast } = useToast();
  const createReview = useCreateReview(productId);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [ratingError, setRatingError] = useState(false);

  const forbidden = createReview.error instanceof ApiError && createReview.error.status === 403;
  const otherError =
    createReview.isError && !forbidden
      ? createReview.error instanceof ApiError
        ? createReview.error.message
        : 'Could not submit your review.'
      : null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setRatingError(true);
      return;
    }
    setRatingError(false);
    createReview.mutate(
      { rating, title: title.trim() || undefined, body: body.trim() },
      {
        onSuccess: () => {
          toast({ variant: 'success', title: 'Thanks for your review!' });
          setRating(0);
          setTitle('');
          setBody('');
        },
      },
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <h3 className="font-serif text-xl font-medium tracking-tight text-ink">Write a review</h3>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          Your rating
        </span>
        <Rating
          value={rating}
          onChange={(v) => {
            setRating(v);
            setRatingError(false);
          }}
          size="lg"
        />
        {ratingError && (
          <p role="alert" className="text-sm text-[color:var(--color-danger)]">
            Please select a rating.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-title" className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          Title <span className="font-medium normal-case text-faint">(optional)</span>
        </label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Sums up your experience"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-body" className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          Review
        </label>
        <textarea
          id="review-body"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you like or dislike?"
          className={cn(fieldClasses, 'h-auto resize-y py-2.5')}
        />
      </div>

      {forbidden && (
        <p role="alert" className="rounded-lg bg-[var(--color-warning-soft)] px-3.5 py-2.5 text-sm text-[var(--color-warning-ink)]">
          Only verified purchasers can review this product. Buy it first and your review will help
          other shoppers.
        </p>
      )}
      {otherError && (
        <p role="alert" className="text-sm text-[color:var(--color-danger)]">
          {otherError}
        </p>
      )}

      <div>
        <Button type="submit" disabled={createReview.isPending}>
          {createReview.isPending ? 'Submitting…' : 'Submit review'}
        </Button>
      </div>
    </form>
  );
}
