import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Site-content e2e. Public surface: POST /contact stores a real ContactMessage and returns a
 * generic ack (no id leaked); validation (422); GET /faq grouped shape; GET /content/:key
 * (200 seeded / 404 unknown). Admin surface: FAQ/content/contact routes require ADMIN (403 for
 * a customer, 401 unauthenticated); contact inbox pagination + mark-handled + delete. Runs only
 * against a *test* DB.
 */
describe('Site content (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminCookie = '';
  let custCookie = '';

  const authCookie = (res: request.Response): string => {
    const arr = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const token = arr.find((c) => c.startsWith('access_token='));
    return token ? token.split(';')[0] : '';
  };
  const login = async (email: string, password: string): Promise<string> =>
    authCookie(await request(app.getHttpServer()).post('/auth/login').send({ email, password }));

  const validContact = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: 'Jordan Shopper',
    email: 'jordan@shop.test',
    subject: 'Question about my order',
    body: 'Hi, I wanted to ask about...',
    ...over,
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

    await prisma.faqItem.deleteMany();
    await prisma.faqCategory.deleteMany();
    await prisma.contactMessage.deleteMany();
    await prisma.contentBlock.deleteMany();
    // FK-safe: orders Restrict the user delete; clear them first (other suites share this DB).
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.create({
      data: {
        email: 'sc-admin@shop.test',
        name: 'SC Admin',
        role: Role.ADMIN,
        passwordHash: await bcrypt.hash('Admin123!', 12),
      },
    });
    const cust = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'sc-cust@shop.test', name: 'Cust', password: 'Password123!' });
    custCookie = authCookie(cust);
    adminCookie = await login('sc-admin@shop.test', 'Admin123!');

    await prisma.contentBlock.create({
      data: { key: 'about', title: 'About Us', body: '# About\nWe sell things.' },
    });
  });

  afterAll(async () => {
    await prisma.faqItem.deleteMany();
    await prisma.faqCategory.deleteMany();
    await prisma.contactMessage.deleteMany();
    await prisma.contentBlock.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('public contact intake', () => {
    beforeEach(async () => {
      await prisma.contactMessage.deleteMany();
    });

    it('stores a real ContactMessage and returns a generic ack with NO id', async () => {
      const res = await request(app.getHttpServer()).post('/contact').send(validContact());
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ received: true, message: expect.any(String) });
      expect(res.body).not.toHaveProperty('id');
      // It was actually persisted.
      const stored = await prisma.contactMessage.findFirst({ where: { email: 'jordan@shop.test' } });
      expect(stored).not.toBeNull();
      expect(stored?.handled).toBe(false);
    });

    it('422 on a bad email', async () => {
      const res = await request(app.getHttpServer())
        .post('/contact')
        .send(validContact({ email: 'not-an-email' }));
      expect(res.status).toBe(422);
      expect(await prisma.contactMessage.count()).toBe(0);
    });

    it('422 on missing required fields', async () => {
      expect((await request(app.getHttpServer()).post('/contact').send({})).status).toBe(422);
      expect(
        (await request(app.getHttpServer()).post('/contact').send(validContact({ subject: '' })))
          .status,
      ).toBe(422);
    });

    it('422 on unknown fields (forbidNonWhitelisted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/contact')
        .send(validContact({ handled: true }));
      expect(res.status).toBe(422);
    });
  });

  describe('public FAQ + content blocks', () => {
    it('GET /faq returns the public grouped shape (categories -> ordered items)', async () => {
      const cat = await prisma.faqCategory.create({
        data: { slug: 'orders-shipping', name: 'Orders & Shipping', position: 0 },
      });
      await prisma.faqItem.create({
        data: { categoryId: cat.id, question: 'How long?', body: '3-5 days', position: 0 },
      });

      const res = await request(app.getHttpServer()).get('/faq');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const group = (res.body as Array<{ slug: string; items: unknown[] }>).find(
        (g) => g.slug === 'orders-shipping',
      );
      expect(group).toBeDefined();
      expect(group?.items.length).toBeGreaterThanOrEqual(1);

      // Cleanup so other suites/tests start clean.
      await prisma.faqItem.deleteMany();
      await prisma.faqCategory.deleteMany();
    });

    it('GET /content/:key is 200 for a seeded key', async () => {
      const res = await request(app.getHttpServer()).get('/content/about');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ key: 'about', title: 'About Us' });
    });

    it('GET /content/:key is 404 for an unknown key', async () => {
      expect((await request(app.getHttpServer()).get('/content/does-not-exist')).status).toBe(404);
    });
  });

  describe('admin authorization gating', () => {
    const adminRoutes: Array<{ method: 'get' | 'post' | 'patch' | 'delete'; path: string }> = [
      { method: 'get', path: '/admin/content' },
      { method: 'get', path: '/admin/contact' },
      { method: 'post', path: '/admin/faq/categories' },
      { method: 'post', path: '/admin/faq/items' },
    ];

    it('401 unauthenticated on admin routes', async () => {
      for (const r of adminRoutes) {
        const res = await request(app.getHttpServer())[r.method](r.path).send({});
        expect(res.status).toBe(401);
      }
    });

    it('403 for a customer on admin routes', async () => {
      for (const r of adminRoutes) {
        const res = await request(app.getHttpServer())
          [r.method](r.path)
          .set('Cookie', custCookie)
          .send({});
        expect(res.status).toBe(403);
      }
    });
  });

  describe('admin FAQ + content management', () => {
    it('admin can create a FAQ category + item and the public FAQ reflects it', async () => {
      const cat = await request(app.getHttpServer())
        .post('/admin/faq/categories')
        .set('Cookie', adminCookie)
        .send({ name: 'Returns', position: 1 });
      expect(cat.status).toBe(201);
      expect(cat.body.slug).toBe('returns'); // slug derived from name

      const item = await request(app.getHttpServer())
        .post('/admin/faq/items')
        .set('Cookie', adminCookie)
        .send({ categoryId: cat.body.id, question: 'Can I return?', body: 'Yes within 30 days.' });
      expect(item.status).toBe(201);

      const faq = await request(app.getHttpServer()).get('/faq');
      const group = (faq.body as Array<{ slug: string; items: Array<{ question: string }> }>).find(
        (g) => g.slug === 'returns',
      );
      expect(group?.items[0].question).toBe('Can I return?');

      // Deleting the category cascades its items away.
      expect(
        (await request(app.getHttpServer())
          .delete(`/admin/faq/categories/${cat.body.id}`)
          .set('Cookie', adminCookie)).status,
      ).toBe(204);
      expect(await prisma.faqItem.count({ where: { categoryId: cat.body.id } })).toBe(0);
    });

    it('admin upsert content block is idempotent (create then replace by key)', async () => {
      const put = (body: Record<string, unknown>) =>
        request(app.getHttpServer())
          .put('/admin/content/privacy')
          .set('Cookie', adminCookie)
          .send(body);

      expect((await put({ title: 'Privacy', body: 'v1' })).status).toBe(200);
      const replaced = await put({ title: 'Privacy', body: 'v2' });
      expect(replaced.status).toBe(200);
      expect(replaced.body.body).toBe('v2');
      // Still exactly one block for that key.
      expect(await prisma.contentBlock.count({ where: { key: 'privacy' } })).toBe(1);

      expect(
        (await request(app.getHttpServer())
          .delete('/admin/content/privacy')
          .set('Cookie', adminCookie)).status,
      ).toBe(204);
    });

    it('404 marking a missing contact message handled', async () => {
      const res = await request(app.getHttpServer())
        .patch('/admin/contact/no-such-id')
        .set('Cookie', adminCookie)
        .send({ handled: true });
      expect(res.status).toBe(404);
    });
  });

  describe('admin contact inbox: pagination + mark-handled + delete', () => {
    beforeEach(async () => {
      await prisma.contactMessage.deleteMany();
    });

    it('paginates newest-first and reports total', async () => {
      for (let i = 0; i < 3; i += 1) {
        await request(app.getHttpServer())
          .post('/contact')
          .send(validContact({ subject: `Msg ${i}` }));
      }
      const page = await request(app.getHttpServer())
        .get('/admin/contact?page=1&pageSize=2')
        .set('Cookie', adminCookie);
      expect(page.status).toBe(200);
      expect(page.body.data).toHaveLength(2);
      expect(page.body.meta).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    });

    // Defect #2 fix verified: the handled filter is now a validated STRING query param parsed in
    // the service ('true' | 'false'), so it survives the global enableImplicitConversion and is no
    // longer inverted. Note the PATCH BODY (MarkHandledDto.handled) is still a real boolean.
    it('handled filter: false->only unhandled, true->only handled, omitted->both', async () => {
      // Two messages; mark exactly one handled.
      await request(app.getHttpServer()).post('/contact').send(validContact({ subject: 'Stays open' }));
      await request(app.getHttpServer()).post('/contact').send(validContact({ subject: 'To handle' }));
      const toHandle = await prisma.contactMessage.findFirstOrThrow({ where: { subject: 'To handle' } });

      const marked = await request(app.getHttpServer())
        .patch(`/admin/contact/${toHandle.id}`)
        .set('Cookie', adminCookie)
        .send({ handled: true });
      expect(marked.status).toBe(200);
      expect(marked.body.handled).toBe(true);
      // DB-level confirmation the flag actually changed.
      expect(
        (await prisma.contactMessage.findUniqueOrThrow({ where: { id: toHandle.id } })).handled,
      ).toBe(true);

      // handled=false -> ONLY the unhandled message (previously inverted; defect #2).
      const unhandled = await request(app.getHttpServer())
        .get('/admin/contact?handled=false')
        .set('Cookie', adminCookie);
      expect(unhandled.body.data).toHaveLength(1);
      expect((unhandled.body.data as Array<{ subject: string; handled: boolean }>)[0]).toMatchObject({
        subject: 'Stays open',
        handled: false,
      });

      // handled=true -> ONLY the handled message.
      const handled = await request(app.getHttpServer())
        .get('/admin/contact?handled=true')
        .set('Cookie', adminCookie);
      expect(handled.body.data).toHaveLength(1);
      expect((handled.body.data as Array<{ handled: boolean }>)[0].handled).toBe(true);

      // Omitted -> both.
      const all = await request(app.getHttpServer()).get('/admin/contact').set('Cookie', adminCookie);
      expect(all.body.data).toHaveLength(2);
    });

    it('rejects an invalid handled value with 422 (only true|false allowed)', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/contact?handled=maybe')
        .set('Cookie', adminCookie);
      expect(res.status).toBe(422);
    });

    it('delete removes a contact message (204, then 404 to mark it)', async () => {
      await request(app.getHttpServer()).post('/contact').send(validContact());
      const created = await prisma.contactMessage.findFirstOrThrow();

      expect(
        (await request(app.getHttpServer())
          .delete(`/admin/contact/${created.id}`)
          .set('Cookie', adminCookie)).status,
      ).toBe(204);
      expect(await prisma.contactMessage.count({ where: { id: created.id } })).toBe(0);
      expect(
        (await request(app.getHttpServer())
          .patch(`/admin/contact/${created.id}`)
          .set('Cookie', adminCookie)
          .send({ handled: true })).status,
      ).toBe(404);
    });
  });
});
