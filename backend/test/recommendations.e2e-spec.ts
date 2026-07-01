import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { OrderStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Recommendations e2e — the priority ladder (purchase history → cart → top sellers),
 * exclusion of owned/inactive products, related-by-category, and the requirement that
 * recommendations update after a new purchase.
 */
describe('Recommendations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Products across two categories. Apparel: a1,a2,a3 (a3 inactive). Home: h1,h2.
  let a1 = '';
  let a2 = '';
  let a3 = '';
  let h1 = '';
  let h2 = '';

  const authCookie = (res: request.Response): string => {
    const arr = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const token = arr.find((c) => c.startsWith('access_token='));
    return token ? token.split(';')[0] : '';
  };
  const signup = async (email: string): Promise<{ cookie: string; id: string }> => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, name: email.split('@')[0], password: 'Password123!' });
    return { cookie: authCookie(res), id: res.body.id as string };
  };
  const get = (path: string, cookie?: string) => {
    const req = request(app.getHttpServer()).get(path);
    return cookie ? req.set('Cookie', cookie) : req;
  };

  // Helper: place an order containing a product, decrementing nothing (analytics-style direct insert).
  const orderProduct = (userId: string, productId: string, category: string, qty: number, status = OrderStatus.DELIVERED) =>
    prisma.order.create({
      data: {
        userId,
        status,
        totalCents: 1000 * qty,
        items: {
          create: [
            {
              productId,
              productName: productId,
              productImageUrl: 'https://x.com/i.png',
              productCategory: category,
              unitPriceCents: 1000,
              quantity: qty,
            },
          ],
        },
      },
    });

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

    const categoryId: Record<string, string> = {
      Apparel: (await prisma.category.create({ data: { name: 'Apparel', slug: 'apparel', isActive: true } })).id,
      Home: (await prisma.category.create({ data: { name: 'Home', slug: 'home', isActive: true } })).id,
    };

    const mk = async (sku: string, category: 'Apparel' | 'Home', isActive = true) =>
      (
        await prisma.product.create({
          data: { sku, name: sku, description: 'x', priceCents: 1000, imageUrl: 'https://x.com/i.png', categoryId: categoryId[category], stock: 50, isActive },
        })
      ).id;
    a1 = await mk('A1', 'Apparel');
    a2 = await mk('A2', 'Apparel');
    a3 = await mk('A3', 'Apparel', false); // inactive — must never be recommended
    h1 = await mk('H1', 'Home');
    h2 = await mk('H2', 'Home');

    // Give h1 and h2 sales so they are the global top sellers (a1/a2 have none yet).
    const seeder = await signup('seeder@r.test');
    await orderProduct(seeder.id, h1, 'Home', 9);
    await orderProduct(seeder.id, h2, 'Home', 5);
  });

  afterAll(async () => {
    // Leave no orders behind (Order→User Restrict would block a later suite's user cleanup).
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await app.close();
  });

  it('guest → top sellers (active only), never inactive', async () => {
    const res = await get('/recommendations');
    expect(res.status).toBe(200);
    expect(res.body.strategy).toBe('TOP_SELLERS');
    const ids = res.body.items.map((p: { id: string }) => p.id);
    expect(ids).not.toContain(a3); // inactive
    // h1 (9 units) ranks ahead of h2 (5 units)
    expect(ids.indexOf(h1)).toBeLessThan(ids.indexOf(h2));
  });

  it('customer with purchase history → products from purchased categories, excluding owned', async () => {
    const buyer = await signup('apparel-buyer@r.test');
    await orderProduct(buyer.id, a1, 'Apparel', 1); // bought A1 (Apparel)

    const res = await get('/recommendations', buyer.cookie);
    expect(res.status).toBe(200);
    expect(res.body.strategy).toBe('PURCHASE_HISTORY');
    const ids = res.body.items.map((p: { id: string }) => p.id);
    expect(ids).toContain(a2); // other active Apparel product
    expect(ids).not.toContain(a1); // already owned
    expect(ids).not.toContain(a3); // inactive Apparel product
  });

  it('new customer with a cart but no orders → products from cart categories', async () => {
    const browser = await signup('cart-only@r.test');
    // Put a Home product in the cart; expect Home recommendations (and not the cart item itself).
    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Cookie', browser.cookie)
      .send({ productId: h1, quantity: 1 });

    const res = await get('/recommendations', browser.cookie);
    expect(res.status).toBe(200);
    expect(res.body.strategy).toBe('CART');
    const ids = res.body.items.map((p: { id: string }) => p.id);
    expect(ids).toContain(h2); // other Home product
    expect(ids).not.toContain(h1); // the cart item itself is excluded
  });

  it('recommendations update after a new purchase (history overrides cart)', async () => {
    const u = await signup('evolving@r.test');

    // 1) Cart-only signal first.
    await request(app.getHttpServer()).post('/cart/items').set('Cookie', u.cookie).send({ productId: a1, quantity: 1 });
    const before = await get('/recommendations', u.cookie);
    expect(before.body.strategy).toBe('CART');

    // 2) After an actual purchase, the strategy switches to purchase history.
    await orderProduct(u.id, h1, 'Home', 1);
    const after = await get('/recommendations', u.cookie);
    expect(after.body.strategy).toBe('PURCHASE_HISTORY');
    const ids = after.body.items.map((p: { id: string }) => p.id);
    expect(ids).toContain(h2); // a Home product (purchased category), not owned
  });

  it('related products are same-category and exclude the product itself + inactive', async () => {
    const res = await get(`/recommendations/related/${a1}`);
    expect(res.status).toBe(200);
    expect(res.body.strategy).toBe('RELATED_CATEGORY');
    const ids = res.body.items.map((p: { id: string }) => p.id);
    expect(ids).toContain(a2); // same category (Apparel)
    expect(ids).not.toContain(a1); // not itself
    expect(ids).not.toContain(a3); // inactive
    expect(ids).not.toContain(h1); // different category
  });

  it('related for an unknown product falls back to top sellers', async () => {
    const res = await get('/recommendations/related/does-not-exist');
    expect(res.status).toBe(200);
    expect(res.body.strategy).toBe('TOP_SELLERS');
    expect(res.body.items.length).toBeGreaterThan(0);
  });
});
