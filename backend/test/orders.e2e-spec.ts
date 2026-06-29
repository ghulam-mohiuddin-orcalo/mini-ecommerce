import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MOCK_DECLINE_TOKEN } from '../src/payments/payment.interface';

/**
 * Checkout e2e — the integrity core. Covers success, every rollback path, snapshot
 * immutability, and order ownership.
 */
describe('Orders / checkout (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookieA = '';
  let cookieB = '';
  let p1 = '';
  let p2 = '';

  const authCookie = (res: request.Response): string => {
    const arr = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const token = arr.find((c) => c.startsWith('access_token='));
    return token ? token.split(';')[0] : '';
  };
  const signup = async (email: string): Promise<string> =>
    authCookie(
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email, name: 'Buyer', password: 'Password123!' }),
    );

  const addToCart = (cookie: string, productId: string, quantity: number) =>
    request(app.getHttpServer()).post('/cart/items').set('Cookie', cookie).send({ productId, quantity });
  const checkout = (cookie: string, paymentToken?: string) =>
    request(app.getHttpServer())
      .post('/orders')
      .set('Cookie', cookie)
      .send(paymentToken ? { paymentToken } : {});
  const stockOf = async (id: string): Promise<number> =>
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

    p1 = (await prisma.product.create({ data: { sku: 'O1', name: 'Thing One', description: 'x', priceCents: 1000, imageUrl: 'x', category: 'Home', stock: 10, isActive: true } })).id;
    p2 = (await prisma.product.create({ data: { sku: 'O2', name: 'Thing Two', description: 'x', priceCents: 500, imageUrl: 'x', category: 'Home', stock: 10, isActive: true } })).id;
    cookieA = await signup('buyerA@shop.test');
    cookieB = await signup('buyerB@shop.test');
  });

  afterAll(async () => {
    await app.close();
  });

  // Reset to a known state before every test so they're independent.
  beforeEach(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.product.update({ where: { id: p1 }, data: { stock: 10, isActive: true, priceCents: 1000, name: 'Thing One' } });
    await prisma.product.update({ where: { id: p2 }, data: { stock: 10, isActive: true, priceCents: 500 } });
  });

  it('rejects checkout with an empty cart (400)', async () => {
    expect((await checkout(cookieA)).status).toBe(400);
  });

  it('completes checkout: snapshots, total = line sums, decrements stock, clears cart', async () => {
    await addToCart(cookieA, p1, 2);
    await addToCart(cookieA, p2, 3);

    const res = await checkout(cookieA);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.paymentRef).toBeTruthy();
    expect(res.body.totalCents).toBe(2 * 1000 + 3 * 500); // 3500
    const lineSum = res.body.items.reduce((s: number, i: { lineTotalCents: number }) => s + i.lineTotalCents, 0);
    expect(lineSum).toBe(res.body.totalCents);

    expect(await stockOf(p1)).toBe(8);
    expect(await stockOf(p2)).toBe(7);
    const cart = await request(app.getHttpServer()).get('/cart').set('Cookie', cookieA);
    expect(cart.body.items).toHaveLength(0);
  });

  it('declined payment: no order, stock and cart unchanged (402)', async () => {
    await addToCart(cookieA, p1, 2);
    const res = await checkout(cookieA, MOCK_DECLINE_TOKEN);
    expect(res.status).toBe(402);

    expect(await prisma.order.count()).toBe(0);
    expect(await stockOf(p1)).toBe(10);
    const cart = await request(app.getHttpServer()).get('/cart').set('Cookie', cookieA);
    expect(cart.body.items[0].quantity).toBe(2);
  });

  it('rolls back fully when a later line has insufficient stock (409)', async () => {
    await addToCart(cookieA, p1, 2); // fine
    await addToCart(cookieA, p2, 2); // will become short
    await prisma.product.update({ where: { id: p2 }, data: { stock: 1 } });

    const res = await checkout(cookieA);
    expect(res.status).toBe(409);
    // p1 was decremented earlier in the loop, then rolled back:
    expect(await stockOf(p1)).toBe(10);
    expect(await stockOf(p2)).toBe(1);
    expect(await prisma.order.count()).toBe(0);
  });

  it('rejects checkout when a product became inactive (409, rollback)', async () => {
    await addToCart(cookieA, p1, 1);
    await prisma.product.update({ where: { id: p1 }, data: { isActive: false } });
    const res = await checkout(cookieA);
    expect(res.status).toBe(409);
    expect(await stockOf(p1)).toBe(10);
    expect(await prisma.order.count()).toBe(0);
  });

  it('keeps order snapshots unchanged when the product is edited later', async () => {
    await addToCart(cookieA, p1, 1);
    const order = (await checkout(cookieA)).body;

    await prisma.product.update({
      where: { id: p1 },
      data: { priceCents: 9999, name: 'Renamed', imageUrl: 'changed' },
    });

    const refetched = await request(app.getHttpServer()).get(`/orders/${order.id}`).set('Cookie', cookieA);
    expect(refetched.body.items[0].unitPriceCents).toBe(1000);
    expect(refetched.body.items[0].productName).toBe('Thing One');
    expect(refetched.body.totalCents).toBe(1000);
  });

  it('never exposes another customer\'s orders', async () => {
    await addToCart(cookieA, p1, 1);
    const order = (await checkout(cookieA)).body;

    // B cannot read A's order by id...
    expect((await request(app.getHttpServer()).get(`/orders/${order.id}`).set('Cookie', cookieB)).status).toBe(404);
    // ...and B's order list never contains it.
    const bOrders = await request(app.getHttpServer()).get('/orders').set('Cookie', cookieB);
    expect(bOrders.body.find((o: { id: string }) => o.id === order.id)).toBeUndefined();
  });
});
