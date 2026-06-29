import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Cart e2e: operations, stock/active validation, totals, and (critically) ownership isolation —
 * proving one customer can never read or mutate another customer's cart.
 */
describe('Cart (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let productId: string;
  let inactiveId: string;
  let cookieA = '';
  let cookieB = '';

  const PRICE = 1000;
  const STOCK = 5;

  const authCookie = (res: request.Response): string => {
    const arr = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const token = arr.find((c) => c.startsWith('access_token='));
    return token ? token.split(';')[0] : '';
  };

  const signupAndCookie = async (email: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, name: 'Cart Tester', password: 'Password123!' });
    return authCookie(res);
  };

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error('Refusing to run e2e tests: DATABASE_URL must point at a test database.');
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    const product = await prisma.product.create({
      data: { sku: 'C1', name: 'Cart Widget', description: 'x', priceCents: PRICE, imageUrl: 'x', category: 'Home', stock: STOCK, isActive: true },
    });
    productId = product.id;
    const inactive = await prisma.product.create({
      data: { sku: 'C2', name: 'Gone', description: 'x', priceCents: 500, imageUrl: 'x', category: 'Home', stock: 5, isActive: false },
    });
    inactiveId = inactive.id;

    cookieA = await signupAndCookie('cartA@shop.test');
    cookieB = await signupAndCookie('cartB@shop.test');
  });

  afterAll(async () => {
    await app.close();
  });

  const add = (cookie: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/cart/items').set('Cookie', cookie).send(body);
  const getCart = (cookie: string) =>
    request(app.getHttpServer()).get('/cart').set('Cookie', cookie);

  it('requires authentication', async () => {
    expect((await request(app.getHttpServer()).get('/cart')).status).toBe(401);
  });

  it('adds an item and computes totals from current price', async () => {
    const res = await add(cookieA, { productId, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ quantity: 2, unitPriceCents: PRICE, lineTotalCents: 2000 });
    expect(res.body.totalCents).toBe(2000);
    expect(res.body.itemCount).toBe(2);
  });

  it('merges a repeat add into the same line (no duplicates)', async () => {
    const res = await add(cookieA, { productId, quantity: 1 });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(3);
    expect(res.body.totalCents).toBe(3000);
  });

  it('rejects exceeding stock with 409', async () => {
    const res = await add(cookieA, { productId, quantity: STOCK }); // 3 + 5 > 5
    expect(res.status).toBe(409);
    // cart unchanged
    expect((await getCart(cookieA)).body.items[0].quantity).toBe(3);
  });

  it('rejects an inactive product with 404', async () => {
    expect((await add(cookieA, { productId: inactiveId, quantity: 1 })).status).toBe(404);
  });

  it('rejects a client-supplied userId (422, cannot be injected)', async () => {
    const res = await add(cookieA, { productId, quantity: 1, userId: 'someone-else' });
    expect(res.status).toBe(422);
  });

  it('rejects zero/negative quantity (422)', async () => {
    expect((await add(cookieA, { productId, quantity: 0 })).status).toBe(422);
    expect((await add(cookieA, { productId, quantity: -1 })).status).toBe(422);
  });

  it('updates quantity and recomputes totals', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/cart/items/${productId}`)
      .set('Cookie', cookieA)
      .send({ quantity: 4 });
    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(4);
    expect(res.body.totalCents).toBe(4000);
  });

  it('removes an item', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/cart/items/${productId}`)
      .set('Cookie', cookieA);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.totalCents).toBe(0);
  });

  describe('ownership isolation', () => {
    it("customer B never sees or affects customer A's cart", async () => {
      await add(cookieA, { productId, quantity: 2 });

      // B's cart is its own, empty cart — not A's.
      const bCart = await getCart(cookieB);
      expect(bCart.body.items).toHaveLength(0);

      // B operating on the same productId touches only B's cart; A's is unchanged.
      await add(cookieB, { productId, quantity: 1 });
      expect((await getCart(cookieA)).body.items[0].quantity).toBe(2);
      expect((await getCart(cookieB)).body.items[0].quantity).toBe(1);

      // B clearing its cart does not affect A.
      await request(app.getHttpServer()).delete('/cart').set('Cookie', cookieB);
      expect((await getCart(cookieB)).body.items).toHaveLength(0);
      expect((await getCart(cookieA)).body.items[0].quantity).toBe(2);
    });
  });
});
