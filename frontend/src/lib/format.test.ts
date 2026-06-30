import { describe, it, expect } from 'vitest';
import { formatPrice } from '@/lib/format';

describe('formatPrice (integer cents → currency string)', () => {
  it('formats representative amounts without float drift', () => {
    expect(formatPrice(0)).toBe('$0.00');
    expect(formatPrice(100)).toBe('$1.00');
    expect(formatPrice(3299)).toBe('$32.99');
    expect(formatPrice(6598)).toBe('$65.98');
    expect(formatPrice(199999)).toBe('$1,999.99');
  });

  it('matches how the order summary sums line totals (cents, then format once)', () => {
    // Two units at $32.99 — summed in integer cents exactly like the summary aside.
    const lineTotals = [3299, 3299];
    const subtotal = lineTotals.reduce((sum, c) => sum + c, 0);
    expect(subtotal).toBe(6598);
    expect(formatPrice(subtotal)).toBe('$65.98');
  });
});
