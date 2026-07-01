import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Product catalog e2e tests against a dedicated test database. Covers the logic that matters:
 * active-only visibility, search/category/price filters, sorting, pagination boundaries, 404s.
 */
describe('Products (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let hiddenId: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error('Refusing to run e2e tests: DATABASE_URL must point at a test database.');
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.user.deleteMany();
    await prisma.product.deleteMany();
    await prisma.product.createMany({
      data: [
        { sku: 'T1', name: 'Alpha Shirt', description: 'A shirt', priceCents: 1000, imageUrl: 'x', category: 'Apparel', stock: 5, isActive: true },
        { sku: 'T2', name: 'Beta Mug', description: 'A mug', priceCents: 2000, imageUrl: 'x', category: 'Home', stock: 0, isActive: true },
        { sku: 'T3', name: 'Gamma Lamp', description: 'A lamp', priceCents: 3000, imageUrl: 'x', category: 'Electronics', stock: 10, isActive: true },
        { sku: 'T4', name: 'Delta Book', description: 'A book', priceCents: 1500, imageUrl: 'x', category: 'Books', stock: 3, isActive: true },
        { sku: 'T5', name: 'Hidden Item', description: 'Soft-deleted', priceCents: 9999, imageUrl: 'x', category: 'Apparel', stock: 5, isActive: false },
      ],
    });
    const hidden = await prisma.product.findUniqueOrThrow({ where: { sku: 'T5' } });
    hiddenId = hidden.id;

    // Seed reviews so products have distinct average ratings for the minRating filter:
    //   Alpha = 5.0, Beta = 4.0, Gamma = 3.0 (2+4), Delta = no reviews (excluded).
    const [t1, t2, t3] = await Promise.all([
      prisma.product.findUniqueOrThrow({ where: { sku: 'T1' } }),
      prisma.product.findUniqueOrThrow({ where: { sku: 'T2' } }),
      prisma.product.findUniqueOrThrow({ where: { sku: 'T3' } }),
    ]);
    const reviewers = await Promise.all(
      ['r1@test.dev', 'r2@test.dev'].map((email, i) =>
        prisma.user.create({ data: { email, passwordHash: 'x', name: `Reviewer ${i + 1}` } }),
      ),
    );
    await prisma.review.createMany({
      data: [
        { productId: t1.id, userId: reviewers[0].id, rating: 5, body: 'great' },
        { productId: t1.id, userId: reviewers[1].id, rating: 5, body: 'great' },
        { productId: t2.id, userId: reviewers[0].id, rating: 4, body: 'good' },
        { productId: t2.id, userId: reviewers[1].id, rating: 4, body: 'good' },
        { productId: t3.id, userId: reviewers[0].id, rating: 2, body: 'meh' },
        { productId: t3.id, userId: reviewers[1].id, rating: 4, body: 'ok' },
      ],
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  const list = (qs = '') => request(app.getHttpServer()).get(`/products${qs}`);

  it('returns only active products', async () => {
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(4);
    expect(res.body.data.map((p: { name: string }) => p.name)).not.toContain('Hidden Item');
  });

  it('searches by name (case-insensitive)', async () => {
    const res = await list('?search=alpha');
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].name).toBe('Alpha Shirt');
  });

  it('filters by category (and still excludes inactive)', async () => {
    const res = await list('?category=Apparel');
    expect(res.body.meta.total).toBe(1); // Alpha only; Hidden Item is inactive
    expect(res.body.data[0].name).toBe('Alpha Shirt');
  });

  it('filters by price range (cents, inclusive)', async () => {
    const res = await list('?minPrice=1500&maxPrice=3000');
    const prices = res.body.data.map((p: { priceCents: number }) => p.priceCents);
    expect(res.body.meta.total).toBe(3);
    expect(prices.every((c: number) => c >= 1500 && c <= 3000)).toBe(true);
  });

  it('filters by minimum average rating across the whole catalog (not just the current page)', async () => {
    const r5 = await list('?minRating=5');
    expect(r5.body.meta.total).toBe(1);
    expect(r5.body.data.map((p: { name: string }) => p.name)).toEqual(['Alpha Shirt']);

    const r4 = await list('?minRating=4');
    expect(r4.body.meta.total).toBe(2);
    expect(r4.body.data.every((p: { ratingAvg: number }) => p.ratingAvg >= 4)).toBe(true);

    const r3 = await list('?minRating=3');
    expect(r3.body.meta.total).toBe(3);
    // Delta Book has no reviews (avg 0) and is always excluded.
    expect(r3.body.data.map((p: { name: string }) => p.name)).not.toContain('Delta Book');
  });

  it('rejects out-of-range or non-integer minRating with 422', async () => {
    expect((await list('?minRating=6')).status).toBe(422);
    expect((await list('?minRating=0')).status).toBe(422);
    expect((await list('?minRating=3.5')).status).toBe(422);
  });

  it('sorts by price ascending', async () => {
    const res = await list('?sort=price_asc');
    const prices = res.body.data.map((p: { priceCents: number }) => p.priceCents);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('paginates with correct meta and respects boundaries', async () => {
    const page1 = await list('?pageSize=2&page=1');
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.meta).toMatchObject({ page: 1, pageSize: 2, total: 4, totalPages: 2 });

    const page3 = await list('?pageSize=2&page=3');
    expect(page3.body.data).toHaveLength(0);
    expect(page3.body.meta.total).toBe(4);
  });

  it('rejects invalid query params with 422', async () => {
    expect((await list('?pageSize=999')).status).toBe(422);
    expect((await list('?sort=banana')).status).toBe(422);
  });

  it('returns a single active product, 404 for inactive or missing', async () => {
    const active = await list('?search=gamma');
    const id = active.body.data[0].id;
    expect((await request(app.getHttpServer()).get(`/products/${id}`)).status).toBe(200);
    expect((await request(app.getHttpServer()).get(`/products/${hiddenId}`)).status).toBe(404);
    expect((await request(app.getHttpServer()).get('/products/nope')).status).toBe(404);
  });

  it('returns real best sellers by paid units sold, excluding cancelled, unpaid, inactive, and out-of-stock products', async () => {
    const buyer = await prisma.user.create({
      data: {
        email: 'best-seller-buyer@example.test',
        passwordHash: 'hash',
        name: 'Best Seller Buyer',
      },
    });
    const alpha = await prisma.product.findUniqueOrThrow({ where: { sku: 'T1' } });
    const betaOutOfStock = await prisma.product.findUniqueOrThrow({ where: { sku: 'T2' } });
    const gamma = await prisma.product.findUniqueOrThrow({ where: { sku: 'T3' } });
    const hidden = await prisma.product.findUniqueOrThrow({ where: { sku: 'T5' } });

    const orderProduct = (
      product: typeof alpha,
      quantity: number,
      opts: { status?: OrderStatus; paidAt?: Date | null } = {},
    ) =>
      prisma.order.create({
        data: {
          userId: buyer.id,
          status: opts.status ?? OrderStatus.DELIVERED,
          totalCents: product.priceCents * quantity,
          paidAt: opts.paidAt === undefined ? new Date() : opts.paidAt,
          items: {
            create: [
              {
                productId: product.id,
                productName: product.name,
                productImageUrl: product.imageUrl,
                productCategory: product.category,
                unitPriceCents: product.priceCents,
                quantity,
              },
            ],
          },
        },
      });

    await orderProduct(gamma, 3);
    await orderProduct(alpha, 5);
    await orderProduct(betaOutOfStock, 20);
    await orderProduct(hidden, 20);
    await orderProduct(gamma, 50, { status: OrderStatus.CANCELLED });
    await orderProduct(gamma, 50, { paidAt: null });

    const res = await request(app.getHttpServer()).get('/products/best-sellers?limit=3&windowDays=90');

    expect(res.status).toBe(200);
    const ids = res.body.map((p: { id: string }) => p.id);
    expect(ids).toEqual([alpha.id, gamma.id]);
    expect(ids).not.toContain(betaOutOfStock.id);
    expect(ids).not.toContain(hidden.id);
  });
});
