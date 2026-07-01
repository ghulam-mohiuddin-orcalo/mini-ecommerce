import {
  ProductBadge,
  ProductEnrichment,
  ProductWithCategory,
  toProductResponse,
} from './product-response.dto';

/**
 * Pure unit tests for the public product DTO mapping. `deriveBadges` and the image fallback are
 * not exported, so they are exercised through `toProductResponse` (the only public surface) — the
 * exact mapping the storefront receives.
 *
 * Badge rules (from product-response.dto.ts):
 *  - SALE:        compareAtPriceCents set AND strictly greater than priceCents.
 *  - NEW:         created within the last 30 days (inclusive boundary).
 *  - BESTSELLER:  unitsSold >= 20.
 *  - TRENDING:    unitsSold >= 5 (and < 20; BESTSELLER wins above).
 */
describe('toProductResponse / deriveBadges', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  /**
   * Build a Product row (with its loaded `category` relation) and sensible defaults; `createdAt`
   * defaults to "now" (so NEW unless overridden). `toProductResponse` requires the nested
   * category `{ id, name, slug }` — the exact shape every caller loads via `include: { category }`.
   */
  const product = (overrides: Partial<ProductWithCategory> = {}): ProductWithCategory => ({
    id: 'p1',
    sku: 'SKU-1',
    name: 'Widget',
    description: 'A widget',
    priceCents: 1000,
    compareAtPriceCents: null,
    imageUrl: 'https://img.test/primary.png',
    categoryId: 'cat-home',
    category: { id: 'cat-home', name: 'Home', slug: 'home' },
    stock: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const badgesOf = (p: ProductWithCategory, e: ProductEnrichment = {}): ProductBadge[] =>
    toProductResponse(p, e).badges;

  describe('SALE badge', () => {
    it('applies only when compareAtPriceCents > priceCents', () => {
      expect(badgesOf(product({ priceCents: 1000, compareAtPriceCents: 1500 }))).toContain('SALE');
    });

    it('does NOT apply when compareAtPriceCents equals priceCents (boundary)', () => {
      expect(badgesOf(product({ priceCents: 1000, compareAtPriceCents: 1000 }))).not.toContain('SALE');
    });

    it('does NOT apply when compareAtPriceCents is below priceCents', () => {
      expect(badgesOf(product({ priceCents: 1000, compareAtPriceCents: 900 }))).not.toContain('SALE');
    });

    it('does NOT apply when compareAtPriceCents is null', () => {
      expect(badgesOf(product({ priceCents: 1000, compareAtPriceCents: null }))).not.toContain('SALE');
    });
  });

  describe('NEW badge (30-day window)', () => {
    it('applies just inside the window (29 days old)', () => {
      const createdAt = new Date(Date.now() - 29 * DAY_MS);
      expect(badgesOf(product({ createdAt }))).toContain('NEW');
    });

    it('applies right at the boundary (~30 days, just under the threshold)', () => {
      // A hair under exactly 30 days so the inclusive `<=` boundary holds deterministically.
      const createdAt = new Date(Date.now() - (30 * DAY_MS - 1000));
      expect(badgesOf(product({ createdAt }))).toContain('NEW');
    });

    it('does NOT apply just outside the window (31 days old)', () => {
      const createdAt = new Date(Date.now() - 31 * DAY_MS);
      expect(badgesOf(product({ createdAt }))).not.toContain('NEW');
    });
  });

  describe('BESTSELLER / TRENDING thresholds (unitsSold)', () => {
    const old = (): ProductWithCategory =>
      product({ createdAt: new Date(Date.now() - 60 * DAY_MS) }); // drop NEW noise

    it('neither below the TRENDING threshold (4 units)', () => {
      const b = badgesOf(old(), { unitsSold: 4 });
      expect(b).not.toContain('TRENDING');
      expect(b).not.toContain('BESTSELLER');
    });

    it('TRENDING just at its threshold (5 units), not yet BESTSELLER', () => {
      const b = badgesOf(old(), { unitsSold: 5 });
      expect(b).toContain('TRENDING');
      expect(b).not.toContain('BESTSELLER');
    });

    it('still only TRENDING just below the BESTSELLER threshold (19 units)', () => {
      const b = badgesOf(old(), { unitsSold: 19 });
      expect(b).toContain('TRENDING');
      expect(b).not.toContain('BESTSELLER');
    });

    it('BESTSELLER (and not TRENDING) exactly at its threshold (20 units)', () => {
      const b = badgesOf(old(), { unitsSold: 20 });
      expect(b).toContain('BESTSELLER');
      expect(b).not.toContain('TRENDING');
    });

    it('treats missing unitsSold as zero (no sales badges)', () => {
      const b = badgesOf(old(), {});
      expect(b).not.toContain('TRENDING');
      expect(b).not.toContain('BESTSELLER');
    });
  });

  describe('image fallback', () => {
    it('falls back to the primary image when no gallery is supplied', () => {
      const p = product({ imageUrl: 'https://img.test/primary.png', name: 'Widget' });
      expect(toProductResponse(p, {}).images).toEqual([
        { url: 'https://img.test/primary.png', alt: 'Widget' },
      ]);
    });

    it('falls back when the gallery is present but empty', () => {
      const p = product();
      expect(toProductResponse(p, { images: [] }).images).toEqual([
        { url: p.imageUrl, alt: p.name },
      ]);
    });

    it('uses the supplied gallery when non-empty', () => {
      const p = product();
      const images = [
        { url: 'https://img.test/a.png', alt: 'A' },
        { url: 'https://img.test/b.png', alt: null },
      ];
      expect(toProductResponse(p, { images }).images).toEqual(images);
    });
  });

  describe('variants on the public DTO', () => {
    it('maps supplied (already active-filtered) variants verbatim', () => {
      const p = product();
      const variants = [
        { id: 'v1', label: 'Black / M', color: 'Black', size: 'M', priceCents: 1200, stock: 3, sku: 'SKU-1-BM' },
      ];
      expect(toProductResponse(p, { variants }).variants).toEqual(variants);
    });

    it('is an empty array when the product has no variants', () => {
      expect(toProductResponse(product(), {}).variants).toEqual([]);
    });
  });

  describe('category reference', () => {
    it('emits the nested category object { id, name, slug } (not a bare string)', () => {
      const res = toProductResponse(
        product({ categoryId: 'cat-apparel', category: { id: 'cat-apparel', name: 'Apparel', slug: 'apparel' } }),
      );
      expect(res.category).toEqual({ id: 'cat-apparel', name: 'Apparel', slug: 'apparel' });
      expect(typeof res.category).toBe('object');
    });
  });

  describe('rating aggregation passthrough', () => {
    it('reflects supplied ratingAvg / ratingCount', () => {
      const res = toProductResponse(product(), { ratingAvg: 4.5, ratingCount: 23 });
      expect(res.ratingAvg).toBe(4.5);
      expect(res.ratingCount).toBe(23);
    });

    it('defaults to 0 / 0 with no reviews', () => {
      const res = toProductResponse(product(), {});
      expect(res.ratingAvg).toBe(0);
      expect(res.ratingCount).toBe(0);
    });
  });

  it('combines independent badges (SALE + NEW + BESTSELLER) without TRENDING', () => {
    const p = product({ priceCents: 1000, compareAtPriceCents: 1500, createdAt: new Date() });
    const b = badgesOf(p, { unitsSold: 25 });
    expect(b).toEqual(expect.arrayContaining(['SALE', 'NEW', 'BESTSELLER']));
    expect(b).not.toContain('TRENDING');
  });
});
