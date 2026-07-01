import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { OrderStatus, Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Admin e2e — authorization, product CRUD/activation, the order state machine,
 * cancellation restock, and analytics correctness.
 */
describe('Admin (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminCookie = '';
  let custCookie = '';
  let custId = '';
  let p1 = '';
  let homeCatId = '';

  const authCookie = (res: request.Response): string => {
    const arr = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const token = arr.find((c) => c.startsWith('access_token='));
    return token ? token.split(';')[0] : '';
  };
  const login = async (email: string, password: string): Promise<string> =>
    authCookie(await request(app.getHttpServer()).post('/auth/login').send({ email, password }));

  const createOrder = (status: OrderStatus, qty: number) =>
    prisma.order.create({
      data: {
        userId: custId,
        status,
        totalCents: 1000 * qty,
        items: {
          create: [
            {
              productId: p1,
              productName: 'P One',
              productImageUrl: 'x',
              productCategory: 'Home',
              unitPriceCents: 1000,
              quantity: qty,
            },
          ],
        },
      },
    });
  const setStatus = (cookie: string, id: string, status: string) =>
    request(app.getHttpServer())
      .patch(`/admin/orders/${id}/status`)
      .set('Cookie', cookie)
      .send({ status });
  const stockOf = async (id: string) =>
    (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error('Refusing to run e2e tests: DATABASE_URL must point at a test database.');
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.user.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();

    homeCatId = (await prisma.category.create({ data: { name: 'Home', slug: 'home', isActive: true } })).id;

    await prisma.user.create({
      data: { email: 'admin@a.test', name: 'Admin', role: Role.ADMIN, passwordHash: await bcrypt.hash('Admin123!', 12) },
    });
    const cust = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'cust@a.test', name: 'Cust', password: 'Password123!' });
    custCookie = authCookie(cust);
    custId = cust.body.id;
    adminCookie = await login('admin@a.test', 'Admin123!');

    p1 = (await prisma.product.create({ data: { sku: 'A1', name: 'P One', description: 'x', priceCents: 1000, imageUrl: 'https://x.com/i.png', categoryId: homeCatId, stock: 10, isActive: true } })).id;
  });

  afterAll(async () => {
    // Clean up the rows this suite created so a later suite's cleanup isn't blocked by FKs
    // (suites share one test DB; Order→User is Restrict, Product→Category is Restrict).
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await app.close();
  });

  describe('authorization', () => {
    it('blocks customers from every admin API (403)', async () => {
      for (const path of ['/admin/products', '/admin/orders', '/admin/analytics']) {
        expect((await request(app.getHttpServer()).get(path).set('Cookie', custCookie)).status).toBe(403);
      }
    });
    it('blocks unauthenticated requests (401)', async () => {
      expect((await request(app.getHttpServer()).get('/admin/analytics')).status).toBe(401);
    });
    it('allows admins (200)', async () => {
      for (const path of ['/admin/products', '/admin/orders', '/admin/analytics']) {
        expect((await request(app.getHttpServer()).get(path).set('Cookie', adminCookie)).status).toBe(200);
      }
    });
  });

  describe('product management', () => {
    it('creates, rejects duplicate SKU, validates, edits, deactivates, reactivates', async () => {
      const create = await request(app.getHttpServer())
        .post('/admin/products')
        .set('Cookie', adminCookie)
        .send({ sku: 'NEW-1', name: 'New', description: 'd', priceCents: 500, imageUrl: 'https://x.com/i.png', categoryId: homeCatId, stock: 4 });
      expect(create.status).toBe(201);
      expect(create.body.category).toMatchObject({ id: homeCatId, name: 'Home', slug: 'home' });
      const id = create.body.id;

      expect(
        (await request(app.getHttpServer()).post('/admin/products').set('Cookie', adminCookie).send({ sku: 'NEW-1', name: 'Dup', description: 'd', priceCents: 1, imageUrl: 'https://x.com/i.png', categoryId: homeCatId, stock: 1 })).status,
      ).toBe(409);

      expect(
        (await request(app.getHttpServer()).post('/admin/products').set('Cookie', adminCookie).send({ sku: 'BAD', name: 'x', description: 'd', priceCents: -1, imageUrl: 'not-a-url', categoryId: homeCatId, stock: 1 })).status,
      ).toBe(422);

      // Unknown categoryId → 404 (the service validates the FK before writing).
      expect(
        (await request(app.getHttpServer()).post('/admin/products').set('Cookie', adminCookie).send({ sku: 'NO-CAT', name: 'x', description: 'd', priceCents: 100, imageUrl: 'https://x.com/i.png', categoryId: 'does-not-exist', stock: 1 })).status,
      ).toBe(404);

      const edit = await request(app.getHttpServer()).patch(`/admin/products/${id}`).set('Cookie', adminCookie).send({ priceCents: 750, stock: 9 });
      expect(edit.body).toMatchObject({ priceCents: 750, stock: 9 });

      await request(app.getHttpServer()).patch(`/admin/products/${id}/deactivate`).set('Cookie', adminCookie);
      expect((await request(app.getHttpServer()).get('/products?search=New')).body.meta.total).toBe(0);
      await request(app.getHttpServer()).patch(`/admin/products/${id}/reactivate`).set('Cookie', adminCookie);
      expect((await request(app.getHttpServer()).get('/products?search=New')).body.meta.total).toBe(1);
    });
  });

  describe('order state machine', () => {
    beforeEach(async () => {
      await prisma.orderItem.deleteMany();
      await prisma.order.deleteMany();
      await prisma.product.update({ where: { id: p1 }, data: { stock: 10 } });
    });

    it('allows valid transitions', async () => {
      const order = await createOrder(OrderStatus.PENDING, 1);
      expect((await setStatus(adminCookie, order.id, 'PROCESSING')).status).toBe(200);
      expect((await setStatus(adminCookie, order.id, 'SHIPPED')).status).toBe(200);
      expect((await setStatus(adminCookie, order.id, 'DELIVERED')).status).toBe(200);
    });

    it('rejects invalid transitions (409)', async () => {
      const delivered = await createOrder(OrderStatus.DELIVERED, 1);
      expect((await setStatus(adminCookie, delivered.id, 'PENDING')).status).toBe(409);
      expect((await setStatus(adminCookie, delivered.id, 'PROCESSING')).status).toBe(409);
      const cancelled = await createOrder(OrderStatus.CANCELLED, 1);
      expect((await setStatus(adminCookie, cancelled.id, 'SHIPPED')).status).toBe(409);
    });

    it('cancelling a PENDING order restores stock', async () => {
      const order = await createOrder(OrderStatus.PENDING, 3);
      expect(await stockOf(p1)).toBe(10);
      expect((await setStatus(adminCookie, order.id, 'CANCELLED')).status).toBe(200);
      expect(await stockOf(p1)).toBe(13);
    });

    it('does not allow cancelling a DELIVERED order (409) and does not change stock', async () => {
      const order = await createOrder(OrderStatus.DELIVERED, 2);
      expect((await setStatus(adminCookie, order.id, 'CANCELLED')).status).toBe(409);
      expect(await stockOf(p1)).toBe(10);
    });

    it('rejects status changes from a customer (403)', async () => {
      const order = await createOrder(OrderStatus.PENDING, 1);
      expect((await setStatus(custCookie, order.id, 'PROCESSING')).status).toBe(403);
    });
  });

  describe('analytics', () => {
    it('reports correct sales (excludes cancelled), counts, and top products', async () => {
      await prisma.orderItem.deleteMany();
      await prisma.order.deleteMany();
      await createOrder(OrderStatus.DELIVERED, 2); // 2000, 2 units
      await createOrder(OrderStatus.PENDING, 1); // 1000, 1 unit
      await createOrder(OrderStatus.CANCELLED, 5); // excluded from sales + top

      const res = await request(app.getHttpServer()).get('/admin/analytics').set('Cookie', adminCookie);
      expect(res.status).toBe(200);
      expect(res.body.totalSalesCents).toBe(3000); // cancelled excluded
      expect(res.body.totalOrders).toBe(3);
      expect(res.body.ordersByStatus.DELIVERED).toBe(1);
      expect(res.body.ordersByStatus.CANCELLED).toBe(1);
      // top product units = 2 (delivered) + 1 (pending) = 3; cancelled 5 excluded
      expect(res.body.topProducts[0]).toMatchObject({ productName: 'P One', unitsSold: 3 });
    });
  });
});
