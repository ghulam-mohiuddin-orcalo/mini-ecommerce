import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';

type Size = 'sm' | 'md' | 'lg';

const PRICE_SIZE: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
};

const COMPARE_SIZE: Record<Size, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export interface PriceTagProps {
  priceCents: number;
  /** Original price for sale items; struck through when higher than the current price. */
  compareAtPriceCents?: number;
  /** Show a computed "-N%" discount pill when on sale. Defaults to false. */
  showDiscount?: boolean;
  size?: Size;
  className?: string;
}

/** Price display with optional strikethrough compare-at and discount badge (integer cents in). */
export function PriceTag({
  priceCents,
  compareAtPriceCents,
  showDiscount = false,
  size = 'md',
  className,
}: PriceTagProps) {
  const onSale = compareAtPriceCents != null && compareAtPriceCents > priceCents;
  const discount = onSale
    ? Math.round(((compareAtPriceCents - priceCents) / compareAtPriceCents) * 100)
    : 0;

  return (
    <span className={cn('inline-flex items-baseline gap-2', className)}>
      <span className={cn('font-bold tracking-tight text-ink', PRICE_SIZE[size])}>
        {formatPrice(priceCents)}
      </span>
      {onSale && (
        <>
          <span className={cn('font-medium text-muted line-through', COMPARE_SIZE[size])}>
            {formatPrice(compareAtPriceCents)}
          </span>
          {showDiscount && (
            <span className="rounded-full bg-[var(--color-danger-soft)] px-2 py-0.5 text-xs font-bold text-[var(--color-danger-ink)]">
              -{discount}%
            </span>
          )}
        </>
      )}
    </span>
  );
}
