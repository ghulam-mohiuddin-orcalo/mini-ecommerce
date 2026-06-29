/** Format an integer-cents amount as a currency string, e.g. 4500 -> "$45.00". */
export function formatPrice(cents: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}
