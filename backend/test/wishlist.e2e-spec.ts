import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Wishlist e2e. Proves idempotent add (one row, never 409/500), no-op remove, a clean true↔false
 * toggle round-trip, active/missing product validation (404), input validation (422), and — the
 * integrity surface — that one user can NEVER read or mutate another user's wishlist (scope/IDOR).
 */
describe('Wishlist (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let cookieA = '';
  let userAId = '';
  let cookieB = '';
  let userBId = '';

  let p1 = '';
  let p2 = '';
  let inactiveId = '';

  const authCookie = (res: request.Response): string => {
    const arr = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const token = arr.find((c) => c.startsWith('access_token='));
    return token ? token.split(';')[0] : '';
  };
  const signup = (email: string) =>
    request(app.getHttpServer()).post('/auth/signup').send({ email, name: 'Wisher', password: 'Password123!' });

  const get = (cookie: string) => request(app.getHttpServer()).get('/wishlist').set('Cookie', cookie);
  const addItem = (cookie: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/wishlist/items').set('Cookie', cookie).send(body);
  const removeItem = (cookie: string, productId: string) =>
    request(app.getHttpServer()).delete(`/wishlist/items/${productId}`).set('Cookie', cookie);
  const toggle = (cookie: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/wishlist/toggle').set('Cookie', cookie).send(body);

  interface WishItem {
    id: string;
    product: { id: string };
  }
  const ids = (res: request.Response): string[] =>
    (res.body.items as WishItem[]).map((i) => i.product.id);

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error('Refusing to run e2e tests: DATABASE_URL must point at a test database.');
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.wishlistItem.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await prisma.product.deleteMany();

    p1 = (await prisma.product.create({ data: { sku: 'WL-1', name: 'Wish One', description: 'x', priceCents: 1000, imageUrl: 'x', category: 'Home', stock: 5, isActive: true } })).id;
    p2 = (await prisma.product.create({ data: { sku: 'WL-2', name: 'Wish Two', description: 'x', priceCents: 2000, imageUrl: 'x', category: 'Home', stock: 5, isActive: true } })).id;
    inactiveId = (await prisma.product.create({ data: { sku: 'WL-3', name: 'Gone', description: 'x', priceCents: 500, imageUrl: 'x', category: 'Home', stock: 5, isActive: false } })).id;

    const a = await signup('wishA@shop.test');
    cookieA = authCookie(a);
    userAId = a.body.id;
    const b = await signup('wishB@shop.test');
    cookieB = authCookie(b);
    userBId = b.body.id;
  });

  afterAll(async () => {
    await prisma.wishlistItem.deleteMany();
    await prisma.user.deleteMany();
    await prisma.product.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.wishlistItem.deleteMany();
  });

  it('requires authentication', async () => {
    expect((await request(app.getHttpServer()).get('/wishlist')).status).toBe(401);
  });

  it('adds a product and it appears in the list', async () => {
    const res = await addItem(cookieA, { productId: p1 });
    expect(res.status).toBe(201);
    expect(ids(res)).toEqual([p1]);
    expect(res.body.itemCount).toBe(1);
  });

  it('double-add is idempotent: one row, no 409/500', async () => {
    expect((await addItem(cookieA, { productId: p1 })).status).toBe(201);
    const second = await addItem(cookieA, { productId: p1 });
    expect(second.status).toBe(201);
    expect(ids(second)).toEqual([p1]);
    expect(second.body.itemCount).toBe(1);
    // Confirm at the DB level there is exactly one row.
    expect(await prisma.wishlistItem.count({ where: { userId: userAId, productId: p1 } })).toBe(1);
  });

  it('removing an absent item is a no-op (still 200/OK, empty list)', async () => {
    const res = await removeItem(cookieA, p1);
    expect(res.status).toBe(200);
    expect(res.body.itemCount).toBe(0);
  });

  it('toggle round-trips wishlisted true ↔ false', async () => {
    const on = await toggle(cookieA, { productId: p2 });
    expect(on.status).toBe(201);
    expect(on.body.wishlisted).toBe(true);
    expect(await prisma.wishlistItem.count({ where: { userId: userAId, productId: p2 } })).toBe(1);

    const off = await toggle(cookieA, { productId: p2 });
    expect(off.body.wishlisted).toBe(false);
    expect(await prisma.wishlistItem.count({ where: { userId: userAId, productId: p2 } })).toBe(0);

    const onAgain = await toggle(cookieA, { productId: p2 });
    expect(onAgain.body.wishlisted).toBe(true);
  });

  it('404 adding an inactive product', async () => {
    expect((await addItem(cookieA, { productId: inactiveId })).status).toBe(404);
  });

  it('404 adding a missing product', async () => {
    expect((await addItem(cookieA, { productId: 'no-such-product' })).status).toBe(404);
  });

  it('404 toggling an inactive product on (when adding)', async () => {
    expect((await toggle(cookieA, { productId: inactiveId })).status).toBe(404);
  });

  it('422 for missing / empty productId', async () => {
    expect((await addItem(cookieA, {})).status).toBe(422);
    expect((await addItem(cookieA, { productId: '' })).status).toBe(422);
    expect((await toggle(cookieA, {})).status).toBe(422);
  });

  it('422 rejects unknown fields (forbidNonWhitelisted)', async () => {
    expect((await addItem(cookieA, { productId: p1, userId: userBId })).status).toBe(422);
  });

  describe('ownership isolation (no IDOR)', () => {
    it("user B never sees or mutates user A's wishlist", async () => {
      await addItem(cookieA, { productId: p1 });
      await addItem(cookieA, { productId: p2 });

      // B's wishlist is its own, empty — not A's.
      const bList = await get(cookieB);
      expect(bList.body.items).toHaveLength(0);

      // B adding the same product touches only B's list; A's is unchanged.
      await addItem(cookieB, { productId: p1 });
      expect(ids(await get(cookieA)).sort()).toEqual([p1, p2].sort());
      expect(ids(await get(cookieB))).toEqual([p1]);
      expect(await prisma.wishlistItem.count({ where: { userId: userAId } })).toBe(2);
      expect(await prisma.wishlistItem.count({ where: { userId: userBId } })).toBe(1);

      // B removing p1 only affects B; A still has both.
      await removeItem(cookieB, p1);
      expect(ids(await get(cookieB))).toEqual([]);
      expect(ids(await get(cookieA)).sort()).toEqual([p1, p2].sort());

      // B toggling p2 off cannot remove A's p2 — they are distinct rows.
      await toggle(cookieB, { productId: p2 }); // adds for B
      await toggle(cookieB, { productId: p2 }); // removes for B
      expect(await prisma.wishlistItem.count({ where: { userId: userAId, productId: p2 } })).toBe(1);
    });
  });
});
