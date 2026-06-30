'use client';

import { cn } from '@/lib/cn';

type Size = 'sm' | 'lg';

const sizes: Record<Size, { box: string; cell: string; value: string; sign: string }> = {
  sm: { box: 'rounded-[10px]', cell: 'h-9 w-9', value: 'h-9 w-10 text-sm', sign: 'text-lg' },
  lg: { box: 'rounded-xl', cell: 'h-12 w-11', value: 'h-12 w-12 text-base', sign: 'text-xl' },
};

/** Accessible − / value / + stepper, clamped to [min, max]. */
export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  size = 'sm',
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: Size;
  className?: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const set = (n: number) => onChange(clamp(n));
  const s = sizes[size];

  return (
    <div
      className={cn(
        'inline-flex items-center overflow-hidden border border-line bg-surface',
        s.box,
        className,
      )}
    >
      <button
        type="button"
        onClick={() => set(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        className={cn(
          'grid place-items-center text-ink-soft transition-colors hover:bg-paper-2 disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent',
          s.cell,
          s.sign,
        )}
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
        className={cn(
          'border-x border-line bg-transparent text-center font-bold text-ink focus-visible:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none',
          s.value,
        )}
      />
      <button
        type="button"
        onClick={() => set(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className={cn(
          'grid place-items-center text-ink-soft transition-colors hover:bg-paper-2 disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent',
          s.cell,
          s.sign,
        )}
      >
        +
      </button>
    </div>
  );
}
