import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ArticleStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Articles (journal) e2e. Proves the public read surface leaks ONLY published, already-live
 * content (drafts and future-dated posts are invisible publicly but visible to admins), the
 * admin CRUD + publish/unpublish transitions of publishedAt, slug auto-derivation, duplicate
 * slug -> 409, related-by-category, and RBAC (403 for a customer, 401 unauthenticated) on every
 * /admin/articles/* route. Runs only against a *test* DB.
 */
describe('Articles (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminCookie = '';
  let custCookie = '';
  let categoryId = '';

  const authCookie = (res: request.Response): string => {
    const arr = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const token = arr.find((c) => c.startsWith('access_token='));
    return token ? token.split(';')[0] : '';
  };
  const login = async (email: string, password: string): Promise<string> =>
    authCookie(await request(app.getHttpServer()).post('/auth/login').send({ email, password }));

  const validArticle = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    title: 'Autumn Wardrobe Edit',
    excerpt: 'A short summary.',
    body: '## Heading\n\nBody text.',
    coverUrl: 'https://example.com/cover.png',
    author: 'Jane Doe',
    ...over,
  });

  const adminCreate = (cookie: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/admin/articles').set('Cookie', cookie).send(body);

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error('Refusing to run e2e tests: DATABASE_URL must point at a test database.');
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.article.deleteMany();
    await prisma.articleCategory.deleteMany();
    // FK-safe: orders Restrict the user delete; clear them first (other suites share this DB).
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.create({
      data: {
        email: 'art-admin@shop.test',
        name: 'Art Admin',
        role: Role.ADMIN,
        passwordHash: await bcrypt.hash('Admin123!', 12),
      },
    });
    const cust = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: 'art-cust@shop.test', name: 'Cust', password: 'Password123!' });
    custCookie = authCookie(cust);
    adminCookie = await login('art-admin@shop.test', 'Admin123!');

    const cat = await prisma.articleCategory.create({
      data: { slug: 'style-guides', name: 'Style Guides' },
    });
    categoryId = cat.id;
  });

  afterAll(async () => {
    await prisma.article.deleteMany();
    await prisma.articleCategory.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.article.deleteMany();
  });

  describe('RBAC on /admin/articles/*', () => {
    it('401 unauthenticated, 403 for a customer, 200 for an admin (list)', async () => {
      expect((await request(app.getHttpServer()).get('/admin/articles')).status).toBe(401);
      expect(
        (await request(app.getHttpServer()).get('/admin/articles').set('Cookie', custCookie)).status,
      ).toBe(403);
      expect(
        (await request(app.getHttpServer()).get('/admin/articles').set('Cookie', adminCookie)).status,
      ).toBe(200);
    });

    it('403 for a customer on every mutating admin route', async () => {
      const draft = await prisma.article.create({
        data: validArticleRow({ slug: 'rbac-probe', status: ArticleStatus.DRAFT }),
      });
      const id = draft.id;
      expect((await adminCreate(custCookie, validArticle())).status).toBe(403);
      expect(
        (await request(app.getHttpServer())
          .patch(`/admin/articles/${id}`)
          .set('Cookie', custCookie)
          .send({ title: 'x' })).status,
      ).toBe(403);
      expect(
        (await request(app.getHttpServer())
          .patch(`/admin/articles/${id}/publish`)
          .set('Cookie', custCookie)
          .send({})).status,
      ).toBe(403);
      expect(
        (await request(app.getHttpServer())
          .patch(`/admin/articles/${id}/unpublish`)
          .set('Cookie', custCookie)
          .send({})).status,
      ).toBe(403);
      expect(
        (await request(app.getHttpServer())
          .delete(`/admin/articles/${id}`)
          .set('Cookie', custCookie)).status,
      ).toBe(403);
      // Customer was blocked at the guard — the draft is untouched.
      expect(await prisma.article.count({ where: { id } })).toBe(1);
    });
  });

  describe('public reads expose only published, already-live content', () => {
    it('GET /articles returns ONLY published; a draft is excluded', async () => {
      await prisma.article.create({
        data: validArticleRow({ slug: 'live-one', status: ArticleStatus.PUBLISHED, publishedAt: new Date() }),
      });
      await prisma.article.create({
        data: validArticleRow({ slug: 'draft-one', status: ArticleStatus.DRAFT }),
      });

      const res = await request(app.getHttpServer()).get('/articles');
      expect(res.status).toBe(200);
      const slugs = (res.body.data as Array<{ slug: string }>).map((a) => a.slug);
      expect(slugs).toContain('live-one');
      expect(slugs).not.toContain('draft-one');
    });

    it('a DRAFT slug -> 404 publicly but 200 via admin findOne by id', async () => {
      const draft = await prisma.article.create({
        data: validArticleRow({ slug: 'secret-draft', status: ArticleStatus.DRAFT }),
      });
      expect((await request(app.getHttpServer()).get('/articles/secret-draft')).status).toBe(404);

      const adminView = await request(app.getHttpServer())
        .get(`/admin/articles/${draft.id}`)
        .set('Cookie', adminCookie);
      expect(adminView.status).toBe(200);
      expect(adminView.body.slug).toBe('secret-draft');
      expect(adminView.body.status).toBe(ArticleStatus.DRAFT);
    });

    it('a future-dated published article is excluded from public reads', async () => {
      await prisma.article.create({
        data: validArticleRow({
          slug: 'tomorrow',
          status: ArticleStatus.PUBLISHED,
          publishedAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      });
      const list = await request(app.getHttpServer()).get('/articles');
      const slugs = (list.body.data as Array<{ slug: string }>).map((a) => a.slug);
      expect(slugs).not.toContain('tomorrow');
      expect((await request(app.getHttpServer()).get('/articles/tomorrow')).status).toBe(404);
    });

    it('GET /articles/:slug returns a single published article', async () => {
      await prisma.article.create({
        data: validArticleRow({ slug: 'readable', status: ArticleStatus.PUBLISHED, publishedAt: new Date() }),
      });
      const res = await request(app.getHttpServer()).get('/articles/readable');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ slug: 'readable', title: 'Autumn Wardrobe Edit' });
    });

    it('GET /articles/:slug/related returns same-category published articles (excludes self + drafts)', async () => {
      await prisma.article.create({
        data: validArticleRow({ slug: 'source', status: ArticleStatus.PUBLISHED, publishedAt: new Date(), categoryId }),
      });
      await prisma.article.create({
        data: validArticleRow({ slug: 'sibling', status: ArticleStatus.PUBLISHED, publishedAt: new Date(), categoryId }),
      });
      await prisma.article.create({
        data: validArticleRow({ slug: 'sibling-draft', status: ArticleStatus.DRAFT, categoryId }),
      });

      const res = await request(app.getHttpServer()).get('/articles/source/related');
      expect(res.status).toBe(200);
      const slugs = (res.body as Array<{ slug: string }>).map((a) => a.slug);
      expect(slugs).toContain('sibling');
      expect(slugs).not.toContain('source'); // excludes self
      expect(slugs).not.toContain('sibling-draft'); // excludes drafts
    });

    it('related of a non-existent / unpublished slug is 404', async () => {
      expect((await request(app.getHttpServer()).get('/articles/no-such/related')).status).toBe(404);
    });
  });

  describe('admin CRUD + publish transitions', () => {
    it('creating with status=DRAFT (default) leaves publishedAt null', async () => {
      const res = await adminCreate(adminCookie, validArticle({ title: 'Draftish' }));
      expect(res.status).toBe(201);
      expect(res.body.status).toBe(ArticleStatus.DRAFT);
      expect(res.body.publishedAt).toBeNull();
      expect(res.body.slug).toBe('draftish'); // slug auto-derived from title
    });

    it('creating with status=PUBLISHED stamps publishedAt', async () => {
      const res = await adminCreate(adminCookie, validArticle({ title: 'Born Live', status: ArticleStatus.PUBLISHED }));
      expect(res.status).toBe(201);
      expect(res.body.publishedAt).not.toBeNull();
    });

    it('auto-derives a UNIQUE slug on collision (-2 suffix)', async () => {
      const first = await adminCreate(adminCookie, validArticle({ title: 'Same Title' }));
      const second = await adminCreate(adminCookie, validArticle({ title: 'Same Title' }));
      expect(first.body.slug).toBe('same-title');
      expect(second.body.slug).toBe('same-title-2');
    });

    // Defect #1 fix verified: an EXPLICIT slug that collides is a 409 (an admin-chosen URL is
    // never silently rewritten); an OMITTED slug still auto-suffixes (covered above).
    it('an EXPLICIT duplicate slug -> 409 on create, persisting nothing new', async () => {
      const first = await adminCreate(adminCookie, validArticle({ slug: 'fixed-slug' }));
      expect(first.body.slug).toBe('fixed-slug');
      const dup = await adminCreate(adminCookie, validArticle({ title: 'Other', slug: 'fixed-slug' }));
      expect(dup.status).toBe(409);
      // No second row was created under that (or an auto-suffixed) slug.
      expect(await prisma.article.count({ where: { slug: 'fixed-slug' } })).toBe(1);
      expect(await prisma.article.count({ where: { slug: 'fixed-slug-2' } })).toBe(0);
    });

    it('an EXPLICIT duplicate slug -> 409 on update (cannot collide with another article)', async () => {
      const a = await adminCreate(adminCookie, validArticle({ title: 'Alpha', slug: 'alpha' }));
      const b = await adminCreate(adminCookie, validArticle({ title: 'Beta', slug: 'beta' }));
      // Try to re-slug B onto A's slug.
      const res = await request(app.getHttpServer())
        .patch(`/admin/articles/${b.body.id}`)
        .set('Cookie', adminCookie)
        .send({ slug: 'alpha' });
      expect(res.status).toBe(409);
      // Both rows keep their original slugs.
      expect((await prisma.article.findUniqueOrThrow({ where: { id: a.body.id } })).slug).toBe('alpha');
      expect((await prisma.article.findUniqueOrThrow({ where: { id: b.body.id } })).slug).toBe('beta');
    });

    it('updating an article to its OWN slug is allowed (no self-collision)', async () => {
      const a = await adminCreate(adminCookie, validArticle({ title: 'Gamma', slug: 'gamma' }));
      const res = await request(app.getHttpServer())
        .patch(`/admin/articles/${a.body.id}`)
        .set('Cookie', adminCookie)
        .send({ slug: 'gamma', title: 'Gamma Edited' });
      expect(res.status).toBe(200);
      expect(res.body.slug).toBe('gamma');
      expect(res.body.title).toBe('Gamma Edited');
    });

    it('publish then unpublish round-trips publishedAt (stamp then clear)', async () => {
      const created = await adminCreate(adminCookie, validArticle({ title: 'Toggle Me' }));
      const id = created.body.id as string;
      expect(created.body.publishedAt).toBeNull();

      const published = await request(app.getHttpServer())
        .patch(`/admin/articles/${id}/publish`)
        .set('Cookie', adminCookie)
        .send({});
      expect(published.status).toBe(200);
      expect(published.body.status).toBe(ArticleStatus.PUBLISHED);
      expect(published.body.publishedAt).not.toBeNull();
      // Now visible publicly.
      expect((await request(app.getHttpServer()).get(`/articles/${published.body.slug}`)).status).toBe(200);

      const unpublished = await request(app.getHttpServer())
        .patch(`/admin/articles/${id}/unpublish`)
        .set('Cookie', adminCookie)
        .send({});
      expect(unpublished.status).toBe(200);
      expect(unpublished.body.status).toBe(ArticleStatus.DRAFT);
      expect(unpublished.body.publishedAt).toBeNull();
      // Hidden publicly again.
      expect((await request(app.getHttpServer()).get(`/articles/${published.body.slug}`)).status).toBe(404);
    });

    it('update to status=PUBLISHED via PATCH stamps publishedAt; reverting clears it', async () => {
      const created = await adminCreate(adminCookie, validArticle({ title: 'Patch Publish' }));
      const id = created.body.id as string;
      const up = await request(app.getHttpServer())
        .patch(`/admin/articles/${id}`)
        .set('Cookie', adminCookie)
        .send({ status: ArticleStatus.PUBLISHED });
      expect(up.body.publishedAt).not.toBeNull();
    });

    it('delete removes the article (404 thereafter)', async () => {
      const created = await adminCreate(adminCookie, validArticle({ title: 'Delete Me' }));
      const id = created.body.id as string;
      expect(
        (await request(app.getHttpServer()).delete(`/admin/articles/${id}`).set('Cookie', adminCookie)).status,
      ).toBe(200);
      expect(
        (await request(app.getHttpServer()).get(`/admin/articles/${id}`).set('Cookie', adminCookie)).status,
      ).toBe(404);
    });

    it('404 on publish/findOne of a missing id', async () => {
      expect(
        (await request(app.getHttpServer()).get('/admin/articles/no-such').set('Cookie', adminCookie)).status,
      ).toBe(404);
      expect(
        (await request(app.getHttpServer())
          .patch('/admin/articles/no-such/publish')
          .set('Cookie', adminCookie)
          .send({})).status,
      ).toBe(404);
    });

    it('422 on invalid create input (missing title, bad coverUrl)', async () => {
      expect((await adminCreate(adminCookie, validArticle({ title: undefined }))).status).toBe(422);
      expect((await adminCreate(adminCookie, validArticle({ coverUrl: 'not-a-url' }))).status).toBe(422);
      expect((await adminCreate(adminCookie, validArticle({ unknownField: 'x' }))).status).toBe(422);
    });
  });
});

/** Build a full Prisma Article create payload directly (used for seeding draft/future rows). */
function validArticleRow(over: {
  slug: string;
  status: ArticleStatus;
  publishedAt?: Date | null;
  categoryId?: string;
}): {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverUrl: string;
  author: string;
  status: ArticleStatus;
  publishedAt: Date | null;
  categoryId: string | null;
} {
  return {
    slug: over.slug,
    title: 'Autumn Wardrobe Edit',
    excerpt: 'A short summary.',
    body: '## Heading\n\nBody.',
    coverUrl: 'https://example.com/cover.png',
    author: 'Jane Doe',
    status: over.status,
    publishedAt: over.publishedAt ?? null,
    categoryId: over.categoryId ?? null,
  };
}
