'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

type Size = 'sm' | 'md' | 'lg';

const STAR_PX: Record<Size, number> = { sm: 14, md: 18, lg: 24 };

interface BaseProps {
  /** Number of stars in the scale. */
  max?: number;
  size?: Size;
  className?: string;
}

interface ReadonlyRatingProps extends BaseProps {
  value: number;
  /** Optional review count shown beside the stars. */
  count?: number;
  onChange?: undefined;
}

interface InputRatingProps extends BaseProps {
  value: number;
  /** Provide to enable interactive (write-a-review) mode. */
  onChange: (value: number) => void;
  count?: undefined;
}

export type RatingProps = ReadonlyRatingProps | InputRatingProps;

/** Brass star rating — read-only (with half-star averages + count) or interactive for reviews. */
export function Rating(props: RatingProps) {
  const { value, max = 5, size = 'md', className } = props;
  const px = STAR_PX[size];
  const [hover, setHover] = useState<number | null>(null);

  if (props.onChange) {
    const onChange = props.onChange;
    const shown = hover ?? value;
    return (
      <div
        role="radiogroup"
        aria-label="Rating"
        className={cn('inline-flex items-center gap-0.5', className)}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: max }, (_, i) => {
          const star = i + 1;
          const filled = star <= shown;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === value}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              onMouseEnter={() => setHover(star)}
              onFocus={() => setHover(star)}
              onClick={() => onChange(star)}
              className={cn(
                'rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                filled ? 'text-accent-500' : 'text-faint hover:text-accent-400',
              )}
            >
              <Icon name={filled ? 'star-filled' : 'star'} size={px} />
            </button>
          );
        })}
      </div>
    );
  }

  const { count } = props;
  const rounded = Math.round(value * 2) / 2; // nearest half
  return (
    <div
      className={cn('inline-flex items-center gap-1.5', className)}
      role="img"
      aria-label={`Rated ${value.toFixed(1)} out of ${max}${count != null ? `, ${count} reviews` : ''}`}
    >
      <span className="inline-flex items-center gap-0.5">
        {Array.from({ length: max }, (_, i) => {
          const star = i + 1;
          const full = rounded >= star;
          const half = !full && rounded >= star - 0.5;
          return (
            <span key={star} aria-hidden="true" className="relative inline-block text-faint">
              <Icon name="star" size={px} />
              {(full || half) && (
                <span
                  className="absolute inset-0 overflow-hidden text-accent-500"
                  style={half ? { width: px / 2 } : undefined}
                >
                  <Icon name="star-filled" size={px} />
                </span>
              )}
            </span>
          );
        })}
      </span>
      {count != null && <span className="text-xs font-medium text-muted">({count})</span>}
    </div>
  );
}
