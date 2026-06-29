'use client';

import { cn } from '@/lib/cn';

/** Accessible − / value / + stepper, clamped to [min, max]. */
export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const set = (n: number) => onChange(clamp(n));

  return (
    <div className={cn('inline-flex items-center rounded-lg border border-line bg-surface', className)}>
      <button
        type="button"
        onClick={() => set(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        className="grid h-9 w-9 place-items-center rounded-l-lg text-lg text-ink transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        aria-label="Quantity"
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) set(n);
        }}
        className="h-9 w-12 border-x border-line bg-transparent text-center text-sm text-ink focus-visible:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => set(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className="grid h-9 w-9 place-items-center rounded-r-lg text-lg text-ink transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
