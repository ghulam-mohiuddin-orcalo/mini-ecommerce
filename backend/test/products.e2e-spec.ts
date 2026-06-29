import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
    await prisma.cartItem.deleteMany();
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
  });

  afterAll(async () => {
    await app.close();
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
});
