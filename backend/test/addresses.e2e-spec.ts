import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Addresses e2e. Proves CRUD scoped to the authenticated user, the SINGLE-DEFAULT invariant
 * (first address auto-default; setting a new default unsets the prior; exactly one default
 * always holds), default-promotion when the default is deleted, validation (422), and — the
 * integrity surface — that one user can NEVER read or mutate another user's address (no IDOR:
 * user B gets 404, never 403-with-data).
 */
describe('Addresses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let cookieA = '';
  let userAId = '';
  let cookieB = '';
  let userBId = '';

  const authCookie = (res: request.Response): string => {
    const arr = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const token = arr.find((c) => c.startsWith('access_token='));
    return token ? token.split(';')[0] : '';
  };
  const signup = (email: string) =>
    request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, name: 'Addr User', password: 'Password123!' });

  interface AddressBody {
    id: string;
    isDefault: boolean;
    [k: string]: unknown;
  }

  const validAddress = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    label: 'Home',
    fullName: 'Jane Doe',
    line1: '221B Baker Street',
    city: 'London',
    postcode: 'NW1 6XE',
    country: 'United Kingdom',
    ...over,
  });

  const list = (cookie: string) =>
    request(app.getHttpServer()).get('/addresses').set('Cookie', cookie);
  const create = (cookie: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/addresses').set('Cookie', cookie).send(body);
  const update = (cookie: string, id: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).patch(`/addresses/${id}`).set('Cookie', cookie).send(body);
  const setDefault = (cookie: string, id: string) =>
    request(app.getHttpServer()).post(`/addresses/${id}/default`).set('Cookie', cookie).send({});
  const remove = (cookie: string, id: string) =>
    request(app.getHttpServer()).delete(`/addresses/${id}`).set('Cookie', cookie);

  const defaults = (addrs: AddressBody[]): AddressBody[] => addrs.filter((a) => a.isDefault);

  beforeAll(async () => {
    // Safety: this suite truncates tables. Refuse to run against anything but a *test* DB.
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error('Refusing to run e2e tests: DATABASE_URL must point at a test database.');
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.address.deleteMany();
    // FK-safe: orders Restrict the user delete; clear them first (other suites share this DB).
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();

    const a = await signup('addrA@shop.test');
    cookieA = authCookie(a);
    userAId = a.body.id;
    const b = await signup('addrB@shop.test');
    cookieB = authCookie(b);
    userBId = b.body.id;
  });

  afterAll(async () => {
    await prisma.address.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.address.deleteMany();
  });

  it('requires authentication on every route', async () => {
    expect((await request(app.getHttpServer()).get('/addresses')).status).toBe(401);
    expect((await request(app.getHttpServer()).post('/addresses').send(validAddress())).status).toBe(
      401,
    );
    expect((await request(app.getHttpServer()).patch('/addresses/x').send({})).status).toBe(401);
    expect((await request(app.getHttpServer()).post('/addresses/x/default').send({})).status).toBe(
      401,
    );
    expect((await request(app.getHttpServer()).delete('/addresses/x')).status).toBe(401);
  });

  describe('single-default invariant', () => {
    it('the FIRST address is auto-default even when isDefault is not sent', async () => {
      const res = await create(cookieA, validAddress({ label: 'First' }));
      expect(res.status).toBe(201);
      expect(res.body.isDefault).toBe(true);
      // Never leak the owning userId to the client.
      expect(res.body).not.toHaveProperty('userId');
    });

    it('a second address does NOT become default unless asked', async () => {
      await create(cookieA, validAddress({ label: 'First' }));
      const second = await create(cookieA, validAddress({ label: 'Second' }));
      expect(second.status).toBe(201);
      expect(second.body.isDefault).toBe(false);
      expect(defaults((await list(cookieA)).body)).toHaveLength(1);
    });

    it('creating with isDefault=true unsets the prior default — exactly one default holds', async () => {
      const first = await create(cookieA, validAddress({ label: 'First' }));
      const second = await create(cookieA, validAddress({ label: 'Second', isDefault: true }));
      expect(second.body.isDefault).toBe(true);

      const all = (await list(cookieA)).body as AddressBody[];
      expect(defaults(all)).toHaveLength(1);
      expect(defaults(all)[0].id).toBe(second.body.id);
      // The previously-default first address was unset.
      const firstReloaded = all.find((a) => a.id === first.body.id);
      expect(firstReloaded?.isDefault).toBe(false);
    });

    it('setDefault promotes one and demotes the others', async () => {
      const first = await create(cookieA, validAddress({ label: 'First' }));
      const second = await create(cookieA, validAddress({ label: 'Second' }));
      expect((await setDefault(cookieA, second.body.id)).status).toBe(200);

      const all = (await list(cookieA)).body as AddressBody[];
      expect(defaults(all).map((a) => a.id)).toEqual([second.body.id]);
      expect(all.find((a) => a.id === first.body.id)?.isDefault).toBe(false);
      // The DB itself holds exactly one default for this user.
      expect(await prisma.address.count({ where: { userId: userAId, isDefault: true } })).toBe(1);
    });

    it('PATCH isDefault=true unsets any other default', async () => {
      const first = await create(cookieA, validAddress({ label: 'First' }));
      const second = await create(cookieA, validAddress({ label: 'Second' }));
      const patched = await update(cookieA, second.body.id, { isDefault: true });
      expect(patched.status).toBe(200);
      expect(patched.body.isDefault).toBe(true);
      expect(await prisma.address.count({ where: { userId: userAId, isDefault: true } })).toBe(1);
      const all = (await list(cookieA)).body as AddressBody[];
      expect(all.find((a) => a.id === first.body.id)?.isDefault).toBe(false);
    });
  });

  describe('default-promotion on delete', () => {
    it('deleting the default promotes the newest remaining to default', async () => {
      const first = await create(cookieA, validAddress({ label: 'First' })); // default
      const second = await create(cookieA, validAddress({ label: 'Second' }));
      const third = await create(cookieA, validAddress({ label: 'Third' }));
      expect(first.body.isDefault).toBe(true);

      const remaining = await remove(cookieA, first.body.id);
      expect(remaining.status).toBe(200);
      const all = remaining.body as AddressBody[];
      expect(all).toHaveLength(2);
      // Exactly one default survives, and it's the newest remaining (third).
      expect(defaults(all)).toHaveLength(1);
      expect(defaults(all)[0].id).toBe(third.body.id);
      expect(all.find((a) => a.id === second.body.id)?.isDefault).toBe(false);
    });

    it('deleting a NON-default does not change the default', async () => {
      const first = await create(cookieA, validAddress({ label: 'First' })); // default
      const second = await create(cookieA, validAddress({ label: 'Second' }));
      const remaining = await remove(cookieA, second.body.id);
      expect(remaining.status).toBe(200);
      const all = remaining.body as AddressBody[];
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(first.body.id);
      expect(all[0].isDefault).toBe(true);
    });

    it('deleting the last (default) address leaves zero — no orphan default', async () => {
      const only = await create(cookieA, validAddress());
      const remaining = await remove(cookieA, only.body.id);
      expect(remaining.body).toHaveLength(0);
      expect(await prisma.address.count({ where: { userId: userAId } })).toBe(0);
    });
  });

  describe('validation (422)', () => {
    it('rejects missing required fields', async () => {
      expect((await create(cookieA, {})).status).toBe(422);
      expect((await create(cookieA, validAddress({ label: undefined }))).status).toBe(422);
      expect((await create(cookieA, validAddress({ city: '' }))).status).toBe(422);
    });

    it('rejects an oversized field (label > 50 chars)', async () => {
      expect((await create(cookieA, validAddress({ label: 'x'.repeat(51) }))).status).toBe(422);
    });

    it('rejects unknown fields (forbidNonWhitelisted) incl. a client-supplied userId', async () => {
      expect((await create(cookieA, validAddress({ userId: userBId }))).status).toBe(422);
    });
  });

  describe('ownership isolation (no IDOR — 404, never 403-with-data)', () => {
    it("B's list never contains A's addresses", async () => {
      await create(cookieA, validAddress({ label: 'A-only' }));
      const bList = await list(cookieB);
      expect(bList.status).toBe(200);
      expect(bList.body).toHaveLength(0);
    });

    it("B gets 404 on PATCH / setDefault / DELETE of A's address id, and A is untouched", async () => {
      const aAddr = await create(cookieA, validAddress({ label: 'A-secret' }));
      const id = aAddr.body.id as string;

      expect((await update(cookieB, id, { label: 'hijacked' })).status).toBe(404);
      expect((await setDefault(cookieB, id)).status).toBe(404);
      expect((await remove(cookieB, id)).status).toBe(404);

      // A's address is completely unchanged after B's probing.
      const reloaded = await prisma.address.findUniqueOrThrow({ where: { id } });
      expect(reloaded.label).toBe('A-secret');
      expect(reloaded.userId).toBe(userAId);
      expect(reloaded.isDefault).toBe(true);
    });

    it('a non-existent id is 404 (same as a foreign id — existence is not leaked)', async () => {
      expect((await update(cookieA, 'no-such-id', { label: 'x' })).status).toBe(404);
      expect((await setDefault(cookieA, 'no-such-id')).status).toBe(404);
      expect((await remove(cookieA, 'no-such-id')).status).toBe(404);
    });

    it("B mutating its own default never touches A's default (distinct rows)", async () => {
      const aAddr = await create(cookieA, validAddress({ label: 'A-default' }));
      await create(cookieB, validAddress({ label: 'B-default' }));
      // B adds and promotes a second address of its own.
      const bSecond = await create(cookieB, validAddress({ label: 'B-second', isDefault: true }));
      expect(bSecond.body.isDefault).toBe(true);

      // A's single default is intact.
      expect(await prisma.address.count({ where: { userId: userAId, isDefault: true } })).toBe(1);
      expect(await prisma.address.count({ where: { userId: userBId, isDefault: true } })).toBe(1);
      const aReloaded = await prisma.address.findUniqueOrThrow({ where: { id: aAddr.body.id } });
      expect(aReloaded.isDefault).toBe(true);
    });
  });
});
