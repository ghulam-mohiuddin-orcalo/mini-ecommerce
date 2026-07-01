import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Categories e2e — the first-class Category taxonomy. Covers the public read surface
 * (active-only, ordered, product counts), admin CRUD with pagination/search/status filters,
 * name/slug uniqueness (409), slug derivation + auto-suffixing, activate/deactivate, the
 * delete-guard (409 while products are assigned; success when empty), and RBAC on every
 * /admin/categories route. Self-sufficient + FK-safe: seeds its own admin/customer, categories,
 * and product, and cleans up after itself. Assumes only a *test* database.
 */
describe('Categories (e2e)', () => {
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

  const adminGet = (path: string) =>
    request(app.getHttpServer()).get(path).set('Cookie', adminCookie);
  const adminPost = (path: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).post(path).set('Cookie', adminCookie).send(body);
  const adminPatch = (path: string, body: Record<string, unknown> = {}) =>
    request(app.getHttpServer()).patch(path).set('Cookie', adminCookie).send(body);
  const adminDelete = (path: string) =>
    request(app.getHttpServer()).delete(path).set('Cookie', adminCookie);

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error('Refusing to run e2e tests: DATABASE_URL must point at a test database.');
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);

    // FK-safe teardown: order/orderItem → cart → product → category → user.
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.create({
      data: {
        email: 'cat-admin@a.test',
        name: 'Cat Admin',
        role: Role.ADMIN,
        passwordHash: await bcrypt.hash('Admin123!', 12),
      },
    });
    const cust = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'cat-cust@a.test', name: 'Cust', password: 'Password123!' });
    custCookie = authCookie(cust);
    adminCookie = await login('cat-admin@a.test', 'Admin123!');
  });

  afterAll(async () => {
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await app.close();
  });

  // -------------------------------------------------------------------------------------
  // Public read surface
  // -------------------------------------------------------------------------------------
  describe('public reads', () => {
    let activeSlug = '';

    beforeAll(async () => {
      await prisma.product.deleteMany();
      await prisma.category.deleteMany();

      // Zed sorts alphabetically after Alpha but has the lower sortOrder, so it must come first.
      const zed = await prisma.category.create({
        data: { name: 'Zed Public', slug: 'zed-public', sortOrder: 0, isActive: true },
      });
      const alpha = await prisma.category.create({
        data: { name: 'Alpha Public', slug: 'alpha-public', sortOrder: 1, isActive: true },
      });
      await prisma.category.create({
        data: { name: 'Hidden Public', slug: 'hidden-public', sortOrder: 2, isActive: false },
      });
      activeSlug = zed.slug;

      // Product counts: two active + one inactive under Zed → active count = 2.
      await prisma.product.createMany({
        data: [
          { sku: 'PUB-1', name: 'P1', description: 'x', priceCents: 100, imageUrl: 'x', categoryId: zed.id, stock: 1, isActive: true },
          { sku: 'PUB-2', name: 'P2', description: 'x', priceCents: 100, imageUrl: 'x', categoryId: zed.id, stock: 1, isActive: true },
          { sku: 'PUB-3', name: 'P3', description: 'x', priceCents: 100, imageUrl: 'x', categoryId: zed.id, stock: 1, isActive: false },
          { sku: 'PUB-4', name: 'P4', description: 'x', priceCents: 100, imageUrl: 'x', categoryId: alpha.id, stock: 1, isActive: true },
        ],
      });
    });

    it('lists only active categories, ordered by sortOrder then name', async () => {
      const res = await request(app.getHttpServer()).get('/categories');
      expect(res.status).toBe(200);
      const names = res.body.map((c: { name: string }) => c.name);
      expect(names).toEqual(['Zed Public', 'Alpha Public']); // sortOrder 0 before 1
      expect(names).not.toContain('Hidden Public'); // inactive excluded
    });

    it('reports productCount as the number of ACTIVE products only', async () => {
      const res = await request(app.getHttpServer()).get('/categories');
      const zed = res.body.find((c: { slug: string }) => c.slug === 'zed-public');
      expect(zed.productCount).toBe(2); // 2 active, the inactive one is not counted
    });

    it('returns a single active category by slug (200)', async () => {
      const res = await request(app.getHttpServer()).get(`/categories/${activeSlug}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ slug: activeSlug, isActive: true, productCount: 2 });
    });

    it('404s for an inactive category slug', async () => {
      expect((await request(app.getHttpServer()).get('/categories/hidden-public')).status).toBe(404);
    });

    it('404s for an unknown slug', async () => {
      expect((await request(app.getHttpServer()).get('/categories/does-not-exist')).status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------------------
  // Admin CRUD
  // -------------------------------------------------------------------------------------
  describe('admin CRUD', () => {
    beforeAll(async () => {
      await prisma.product.deleteMany();
      await prisma.category.deleteMany();
    });

    it('creates a category (201), derives the slug from the name when omitted', async () => {
      const res = await adminPost('/admin/categories', { name: 'Garden Tools' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Garden Tools', slug: 'garden-tools', isActive: true, productCount: 0 });
    });

    it('honours an explicit slug and optional fields', async () => {
      const res = await adminPost('/admin/categories', {
        name: 'Kitchenware',
        slug: 'kitchen',
        description: 'Pots and pans',
        sortOrder: 3,
        isActive: false,
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ slug: 'kitchen', description: 'Pots and pans', sortOrder: 3, isActive: false });
    });

    it('fetches a single category by id (admin, incl. inactive)', async () => {
      const created = await adminPost('/admin/categories', { name: 'Fetchable' });
      const res = await adminGet(`/admin/categories/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: created.body.id, name: 'Fetchable' });
    });

    it('404s fetching an unknown category id', async () => {
      expect((await adminGet('/admin/categories/nope')).status).toBe(404);
    });

    it('edits a category (name + description)', async () => {
      const created = await adminPost('/admin/categories', { name: 'Editable' });
      const res = await adminPatch(`/admin/categories/${created.body.id}`, {
        name: 'Edited',
        description: 'now with a description',
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Edited', description: 'now with a description' });
    });

    it('rejects invalid input with 422 (missing name / bad imageUrl)', async () => {
      expect((await adminPost('/admin/categories', {})).status).toBe(422);
      expect((await adminPost('/admin/categories', { name: 'Bad URL', imageUrl: 'not-a-url' })).status).toBe(422);
    });
  });

  // -------------------------------------------------------------------------------------
  // Uniqueness + slug behaviour
  // -------------------------------------------------------------------------------------
  describe('uniqueness and slug derivation', () => {
    beforeAll(async () => {
      await prisma.product.deleteMany();
      await prisma.category.deleteMany();
    });

    it('rejects a duplicate name with 409', async () => {
      expect((await adminPost('/admin/categories', { name: 'Unique Name' })).status).toBe(201);
      expect((await adminPost('/admin/categories', { name: 'Unique Name' })).status).toBe(409);
    });

    it('rejects an explicit slug collision with 409 (never silently rewrites)', async () => {
      expect((await adminPost('/admin/categories', { name: 'Slug Owner', slug: 'taken-slug' })).status).toBe(201);
      const collision = await adminPost('/admin/categories', { name: 'Slug Rival', slug: 'taken-slug' });
      expect(collision.status).toBe(409);
    });

    it('auto-suffixes a DERIVED slug collision (-2, -3, …)', async () => {
      // Two categories whose names slugify to the same root but have distinct names.
      const first = await adminPost('/admin/categories', { name: 'Sports & Fitness' });
      expect(first.status).toBe(201);
      expect(first.body.slug).toBe('sports-fitness');

      const second = await adminPost('/admin/categories', { name: 'Sports  Fitness' }); // same derived root
      expect(second.status).toBe(201);
      expect(second.body.slug).toBe('sports-fitness-2');

      const third = await adminPost('/admin/categories', { name: 'Sports-Fitness' });
      expect(third.status).toBe(201);
      expect(third.body.slug).toBe('sports-fitness-3');
    });
  });

  // -------------------------------------------------------------------------------------
  // Pagination + search + status filter
  // -------------------------------------------------------------------------------------
  describe('listing: pagination, search, status filter', () => {
    beforeAll(async () => {
      await prisma.product.deleteMany();
      await prisma.category.deleteMany();
      // 5 categories: 3 active ("Filter Alpha/Beta/Gamma"), 2 inactive ("Filter Hidden 1/2").
      await prisma.category.createMany({
        data: [
          { name: 'Filter Alpha', slug: 'filter-alpha', isActive: true, sortOrder: 0 },
          { name: 'Filter Beta', slug: 'filter-beta', isActive: true, sortOrder: 1 },
          { name: 'Filter Gamma', slug: 'filter-gamma', isActive: true, sortOrder: 2 },
          { name: 'Filter Hidden 1', slug: 'filter-hidden-1', isActive: false, sortOrder: 3 },
          { name: 'Filter Hidden 2', slug: 'filter-hidden-2', isActive: false, sortOrder: 4 },
        ],
      });
    });

    it('paginates with correct meta and respects page size', async () => {
      const page1 = await adminGet('/admin/categories?pageSize=2&page=1');
      expect(page1.status).toBe(200);
      expect(page1.body.data).toHaveLength(2);
      expect(page1.body.meta).toMatchObject({ page: 1, pageSize: 2, total: 5, totalPages: 3 });

      const page3 = await adminGet('/admin/categories?pageSize=2&page=3');
      expect(page3.body.data).toHaveLength(1);
      expect(page3.body.meta.total).toBe(5);
    });

    it('search matches name or slug (case-insensitive)', async () => {
      const res = await adminGet('/admin/categories?search=beta');
      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].name).toBe('Filter Beta');
    });

    it('status=active returns only active, status=inactive only inactive', async () => {
      const active = await adminGet('/admin/categories?status=active&pageSize=100');
      expect(active.body.data.every((c: { isActive: boolean }) => c.isActive)).toBe(true);
      expect(active.body.meta.total).toBe(3);

      const inactive = await adminGet('/admin/categories?status=inactive&pageSize=100');
      expect(inactive.body.data.every((c: { isActive: boolean }) => !c.isActive)).toBe(true);
      expect(inactive.body.meta.total).toBe(2);
    });

    it('rejects an out-of-range pageSize with 422', async () => {
      expect((await adminGet('/admin/categories?pageSize=999')).status).toBe(422);
    });
  });

  // -------------------------------------------------------------------------------------
  // Activate / deactivate
  // -------------------------------------------------------------------------------------
  describe('activate / deactivate', () => {
    it('toggles isActive and reflects it in the public listing', async () => {
      await prisma.product.deleteMany();
      await prisma.category.deleteMany();
      const created = await adminPost('/admin/categories', { name: 'Toggle Me', isActive: true });
      const id = created.body.id;

      const off = await adminPatch(`/admin/categories/${id}/deactivate`);
      expect(off.status).toBe(200);
      expect(off.body.isActive).toBe(false);
      // Hidden from the public listing.
      const publicList = await request(app.getHttpServer()).get('/categories');
      expect(publicList.body.find((c: { id: string }) => c.id === id)).toBeUndefined();

      const on = await adminPatch(`/admin/categories/${id}/activate`);
      expect(on.status).toBe(200);
      expect(on.body.isActive).toBe(true);
      const publicList2 = await request(app.getHttpServer()).get('/categories');
      expect(publicList2.body.find((c: { id: string }) => c.id === id)).toBeDefined();
    });

    it('404s activating/deactivating an unknown id', async () => {
      expect((await adminPatch('/admin/categories/nope/activate')).status).toBe(404);
      expect((await adminPatch('/admin/categories/nope/deactivate')).status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------------------
  // Delete guard
  // -------------------------------------------------------------------------------------
  describe('delete', () => {
    beforeEach(async () => {
      await prisma.product.deleteMany();
      await prisma.category.deleteMany();
    });

    it('blocks delete with 409 + a clear message while a product is assigned', async () => {
      const created = await adminPost('/admin/categories', { name: 'Has Products' });
      const id = created.body.id;
      await prisma.product.create({
        data: { sku: 'DEL-1', name: 'Assigned', description: 'x', priceCents: 100, imageUrl: 'x', categoryId: id, stock: 1, isActive: true },
      });

      const res = await adminDelete(`/admin/categories/${id}`);
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/still has products assigned/i);

      // Integrity: the category is untouched (still fetchable).
      expect((await adminGet(`/admin/categories/${id}`)).status).toBe(200);
    });

    it('deletes an empty category (200) and it is then gone', async () => {
      const created = await adminPost('/admin/categories', { name: 'Empty Cat' });
      const id = created.body.id;

      const res = await adminDelete(`/admin/categories/${id}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id });

      expect((await adminGet(`/admin/categories/${id}`)).status).toBe(404);
    });

    it('404s deleting an unknown id', async () => {
      expect((await adminDelete('/admin/categories/nope')).status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------------------
  // RBAC
  // -------------------------------------------------------------------------------------
  describe('RBAC on /admin/categories', () => {
    let existingId = '';

    beforeAll(async () => {
      await prisma.product.deleteMany();
      await prisma.category.deleteMany();
      const created = await adminPost('/admin/categories', { name: 'RBAC Target' });
      existingId = created.body.id;
    });

    type Route = { method: 'get' | 'post' | 'patch' | 'delete'; path: string };
    const routes = (): Route[] => [
      { method: 'get', path: '/admin/categories' },
      { method: 'get', path: `/admin/categories/${existingId}` },
      { method: 'post', path: '/admin/categories' },
      { method: 'patch', path: `/admin/categories/${existingId}` },
      { method: 'patch', path: `/admin/categories/${existingId}/activate` },
      { method: 'patch', path: `/admin/categories/${existingId}/deactivate` },
      { method: 'delete', path: `/admin/categories/${existingId}` },
    ];

    it('rejects anonymous requests with 401 on every admin route', async () => {
      for (const r of routes()) {
        const res = await request(app.getHttpServer())[r.method](r.path).send({});
        expect(res.status).toBe(401);
      }
    });

    it('rejects CUSTOMER requests with 403 on every admin route', async () => {
      for (const r of routes()) {
        const res = await request(app.getHttpServer())[r.method](r.path).set('Cookie', custCookie).send({});
        expect(res.status).toBe(403);
      }
    });

    it('leaves the public GET /categories open to everyone', async () => {
      expect((await request(app.getHttpServer()).get('/categories')).status).toBe(200);
    });
  });
});
