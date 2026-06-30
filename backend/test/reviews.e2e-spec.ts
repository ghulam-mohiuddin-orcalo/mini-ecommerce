import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Reviews e2e — the verified-purchase gate is the integrity surface. A user may only review a
 * product they have a PAID order for (403 otherwise); one review per user/product (409 duplicate);
 * input is validated (422); the public list never leaks reviewer email/id; deletion is owner- or
 * admin-only (403 for anyone else).
 */
describe('Reviews (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let buyerCookie = '';
  let buyerId = '';
  let strangerCookie = '';
  let strangerId = '';
  let adminCookie = '';

  let purchasedId = '';
  let notPurchasedId = '';
  let inactiveId = '';

  const authCookie = (res: request.Response): string => {
    const arr = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const token = arr.find((c) => c.startsWith('access_token='));
    return token ? token.split(';')[0] : '';
  };
  const signup = (email: string) =>
    request(app.getHttpServer()).post('/auth/signup').send({ email, name: 'Tester', password: 'Password123!' });
  const login = async (email: string, password: string): Promise<string> =>
    authCookie(await request(app.getHttpServer()).post('/auth/login').send({ email, password }));

  /** Record a PAID order for `userId` containing `productId` (the review eligibility precondition). */
  const givePaidOrder = (userId: string, productId: string) =>
    prisma.order.create({
      data: {
        userId,
        status: 'DELIVERED',
        totalCents: 1000,
        paidAt: new Date(),
        paymentRef: 'mock_paid',
        items: {
          create: [
            { productId, productName: 'P', productImageUrl: 'x', productCategory: 'Home', unitPriceCents: 1000, quantity: 1 },
          ],
        },
      },
    });

  const postReview = (cookie: string, productId: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).post(`/products/${productId}/reviews`).set('Cookie', cookie).send(body);
  const listReviews = (productId: string, qs = '') =>
    request(app.getHttpServer()).get(`/products/${productId}/reviews${qs}`);

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error('Refusing to run e2e tests: DATABASE_URL must point at a test database.');
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.review.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.user.deleteMany();
    await prisma.product.deleteMany();

    purchasedId = (await prisma.product.create({ data: { sku: 'RV-1', name: 'Bought', description: 'x', priceCents: 1000, imageUrl: 'x', category: 'Home', stock: 10, isActive: true } })).id;
    notPurchasedId = (await prisma.product.create({ data: { sku: 'RV-2', name: 'Unbought', description: 'x', priceCents: 1000, imageUrl: 'x', category: 'Home', stock: 10, isActive: true } })).id;
    inactiveId = (await prisma.product.create({ data: { sku: 'RV-3', name: 'Gone', description: 'x', priceCents: 1000, imageUrl: 'x', category: 'Home', stock: 10, isActive: false } })).id;

    const buyer = await signup('reviewbuyer@shop.test');
    buyerCookie = authCookie(buyer);
    buyerId = buyer.body.id;

    const stranger = await signup('reviewstranger@shop.test');
    strangerCookie = authCookie(stranger);
    strangerId = stranger.body.id;

    await prisma.user.create({
      data: { email: 'reviewadmin@shop.test', name: 'Admin', role: Role.ADMIN, passwordHash: await bcrypt.hash('Admin123!', 12) },
    });
    adminCookie = await login('reviewadmin@shop.test', 'Admin123!');

    await givePaidOrder(buyerId, purchasedId);
  });

  afterAll(async () => {
    await prisma.review.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await prisma.product.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.review.deleteMany();
  });

  describe('eligibility (verified purchase)', () => {
    it('403 when the user has NO paid order for the product', async () => {
      const res = await postReview(buyerCookie, notPurchasedId, { rating: 5, body: 'Great' });
      expect(res.status).toBe(403);
    });

    it('201 when the user has a paid order containing the product', async () => {
      const res = await postReview(buyerCookie, purchasedId, { rating: 5, title: 'Love it', body: 'Great quality' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ rating: 5, title: 'Love it', body: 'Great quality', userName: 'Tester' });
    });

    it('403 when the order exists but is NOT paid (paidAt null)', async () => {
      // An unpaid PENDING order must not unlock reviewing.
      await prisma.order.create({
        data: {
          userId: strangerId, status: 'PENDING', totalCents: 1000, paidAt: null,
          items: { create: [{ productId: purchasedId, productName: 'P', productImageUrl: 'x', productCategory: 'Home', unitPriceCents: 1000, quantity: 1 }] },
        },
      });
      const res = await postReview(strangerCookie, purchasedId, { rating: 4, body: 'Hmm' });
      expect(res.status).toBe(403);
      await prisma.orderItem.deleteMany({ where: { order: { userId: strangerId } } });
      await prisma.order.deleteMany({ where: { userId: strangerId } });
    });

    it('requires authentication (401)', async () => {
      expect((await request(app.getHttpServer()).post(`/products/${purchasedId}/reviews`).send({ rating: 5, body: 'x' })).status).toBe(401);
    });
  });

  describe('duplicate + product validity', () => {
    it('409 on a second review by the same user for the same product', async () => {
      expect((await postReview(buyerCookie, purchasedId, { rating: 5, body: 'First' })).status).toBe(201);
      expect((await postReview(buyerCookie, purchasedId, { rating: 3, body: 'Second' })).status).toBe(409);
    });

    it('404 for an inactive product', async () => {
      expect((await postReview(buyerCookie, inactiveId, { rating: 5, body: 'x' })).status).toBe(404);
    });

    it('404 for a missing product', async () => {
      expect((await postReview(buyerCookie, 'no-such-product', { rating: 5, body: 'x' })).status).toBe(404);
    });
  });

  describe('input validation (422)', () => {
    it('rejects rating below 1 and above 5', async () => {
      expect((await postReview(buyerCookie, purchasedId, { rating: 0, body: 'x' })).status).toBe(422);
      expect((await postReview(buyerCookie, purchasedId, { rating: 6, body: 'x' })).status).toBe(422);
    });

    it('rejects a non-integer rating', async () => {
      expect((await postReview(buyerCookie, purchasedId, { rating: 4.5, body: 'x' })).status).toBe(422);
    });

    it('rejects an empty / missing body', async () => {
      expect((await postReview(buyerCookie, purchasedId, { rating: 5, body: '' })).status).toBe(422);
      expect((await postReview(buyerCookie, purchasedId, { rating: 5 })).status).toBe(422);
    });

    it('rejects an over-length body and over-length title', async () => {
      expect((await postReview(buyerCookie, purchasedId, { rating: 5, body: 'a'.repeat(2001) })).status).toBe(422);
      expect((await postReview(buyerCookie, purchasedId, { rating: 5, body: 'ok', title: 't'.repeat(121) })).status).toBe(422);
    });

    it('rejects unknown fields (forbidNonWhitelisted)', async () => {
      expect((await postReview(buyerCookie, purchasedId, { rating: 5, body: 'ok', userId: strangerId })).status).toBe(422);
    });
  });

  describe('public listing', () => {
    it('is public (no auth), paginated, and never leaks reviewer email/id', async () => {
      await postReview(buyerCookie, purchasedId, { rating: 5, body: 'Public review' });

      const res = await listReviews(purchasedId);
      expect(res.status).toBe(200);
      expect(res.body.meta).toMatchObject({ page: 1, total: 1 });
      const review = res.body.data[0];
      expect(review).toMatchObject({ rating: 5, body: 'Public review', userName: 'Tester' });
      // No identifiers leaked.
      expect(review.email).toBeUndefined();
      expect(review.userId).toBeUndefined();
      expect(review.user).toBeUndefined();
      expect(JSON.stringify(review)).not.toContain('reviewbuyer@shop.test');
    });

    it('honours pagination params', async () => {
      const res = await listReviews(purchasedId, '?page=2&pageSize=5');
      expect(res.status).toBe(200);
      expect(res.body.meta).toMatchObject({ page: 2, pageSize: 5 });
    });

    it('rejects invalid pagination (422)', async () => {
      expect((await listReviews(purchasedId, '?pageSize=999')).status).toBe(422);
    });
  });

  describe('deletion (owner or admin only)', () => {
    const createReview = async (): Promise<string> => {
      const res = await postReview(buyerCookie, purchasedId, { rating: 4, body: 'To be deleted' });
      expect(res.status).toBe(201);
      return res.body.id as string;
    };
    const del = (cookie: string, id: string) =>
      request(app.getHttpServer()).delete(`/reviews/${id}`).set('Cookie', cookie);

    it('403 for a non-owner, non-admin', async () => {
      const id = await createReview();
      expect((await del(strangerCookie, id)).status).toBe(403);
      // still present
      expect((await listReviews(purchasedId)).body.meta.total).toBe(1);
    });

    it('204 for the owner', async () => {
      const id = await createReview();
      expect((await del(buyerCookie, id)).status).toBe(204);
      expect((await listReviews(purchasedId)).body.meta.total).toBe(0);
    });

    it('204 for an admin deleting someone else’s review', async () => {
      const id = await createReview();
      expect((await del(adminCookie, id)).status).toBe(204);
      expect((await listReviews(purchasedId)).body.meta.total).toBe(0);
    });

    it('404 deleting a non-existent review', async () => {
      expect((await del(buyerCookie, 'no-such-review')).status).toBe(404);
    });

    it('401 deleting unauthenticated', async () => {
      const id = await createReview();
      expect((await request(app.getHttpServer()).delete(`/reviews/${id}`)).status).toBe(401);
    });
  });
});
