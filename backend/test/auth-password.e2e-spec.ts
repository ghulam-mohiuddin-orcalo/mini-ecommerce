import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { createHash } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Password reset + change e2e. Proves: no user enumeration on forgot-password (identical 200
 * body for existing vs unknown email), the dev-only resetToken echo (NODE_ENV=test), a real
 * single-use + time-limited reset token, and the authenticated change-password flow (current
 * password required; old password stops working afterwards). Runs only against a *test* DB.
 */
describe('Auth password reset & change (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const KNOWN = { email: 'pw-known@shop.test', name: 'Known', password: 'Password123!' };

  const authCookie = (res: request.Response): string => {
    const arr = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const token = arr.find((c) => c.startsWith('access_token='));
    return token ? token.split(';')[0] : '';
  };
  const signup = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/auth/signup').send(body);
  const login = (email: string, password: string) =>
    request(app.getHttpServer()).post('/auth/login').send({ email, password });
  const forgot = (email: unknown) =>
    request(app.getHttpServer()).post('/auth/forgot-password').send({ email });
  const reset = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/auth/reset-password').send(body);
  const change = (cookie: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/auth/change-password').set('Cookie', cookie).send(body);

  /** SHA-256 hex of a raw token — mirrors the service's at-rest fingerprint. */
  const hashToken = (raw: string): string => createHash('sha256').update(raw).digest('hex');

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error('Refusing to run e2e tests: DATABASE_URL must point at a test database.');
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.passwordResetToken.deleteMany();
    // FK-safe: orders Restrict the user delete; clear them first (other suites share this DB).
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await signup(KNOWN);
  });

  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('forgot-password (no enumeration)', () => {
    it('returns the SAME generic 200 body for an existing and an unknown email', async () => {
      const hit = await forgot(KNOWN.email);
      const miss = await forgot('nobody-here@shop.test');
      expect(hit.status).toBe(200);
      expect(miss.status).toBe(200);
      expect(hit.body.message).toBe(miss.body.message);
      // An unknown email never yields a token.
      expect(miss.body.resetToken).toBeUndefined();
    });

    it('echoes a dev-only resetToken for a real account (NODE_ENV is not production)', async () => {
      const res = await forgot(KNOWN.email);
      expect(typeof res.body.resetToken).toBe('string');
      expect((res.body.resetToken as string).length).toBeGreaterThan(0);
      // The token is persisted ONLY as a hash, never the raw value.
      const stored = await prisma.passwordResetToken.findFirst({
        where: { tokenHash: hashToken(res.body.resetToken) },
      });
      expect(stored).not.toBeNull();
    });

    it('issuing a new token invalidates the prior outstanding one', async () => {
      const first = (await forgot(KNOWN.email)).body.resetToken as string;
      const second = (await forgot(KNOWN.email)).body.resetToken as string;
      expect(first).not.toBe(second);
      // The first token is now marked used and can no longer reset.
      const firstRow = await prisma.passwordResetToken.findFirstOrThrow({
        where: { tokenHash: hashToken(first) },
      });
      expect(firstRow.usedAt).not.toBeNull();
    });

    it('422 on a malformed email', async () => {
      expect((await forgot('not-an-email')).status).toBe(422);
    });
  });

  describe('reset-password', () => {
    const NEW_PASSWORD = 'BrandNew123!';

    it('a valid token resets the password and the new password then logs in', async () => {
      const token = (await forgot(KNOWN.email)).body.resetToken as string;
      const res = await reset({ token, password: NEW_PASSWORD });
      expect(res.status).toBe(200);

      // New password works; the old one no longer does.
      expect((await login(KNOWN.email, NEW_PASSWORD)).status).toBe(200);
      expect((await login(KNOWN.email, KNOWN.password)).status).toBe(401);

      // Restore the canonical password so later tests use KNOWN.password again.
      const restore = (await forgot(KNOWN.email)).body.resetToken as string;
      expect((await reset({ token: restore, password: KNOWN.password })).status).toBe(200);
    });

    it('a token cannot be reused a SECOND time (single-use)', async () => {
      const token = (await forgot(KNOWN.email)).body.resetToken as string;
      expect((await reset({ token, password: KNOWN.password })).status).toBe(200);
      // Second use of the same raw token fails generically.
      const second = await reset({ token, password: 'Another123!' });
      expect(second.status).toBe(400);
    });

    it('an EXPIRED token fails (generic 400)', async () => {
      const user = await prisma.user.findUniqueOrThrow({ where: { email: KNOWN.email } });
      const rawToken = 'expired-token-raw-value-1234567890';
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() - 60_000), // one minute in the past
        },
      });
      const res = await reset({ token: rawToken, password: KNOWN.password });
      expect(res.status).toBe(400);
    });

    it('a garbage token fails (generic 400)', async () => {
      expect((await reset({ token: 'totally-made-up-token', password: KNOWN.password })).status).toBe(
        400,
      );
    });

    it('422 on a too-short new password', async () => {
      const token = (await forgot(KNOWN.email)).body.resetToken as string;
      expect((await reset({ token, password: 'short' })).status).toBe(422);
    });
  });

  describe('change-password (authenticated)', () => {
    const CP_USER = { email: 'pw-change@shop.test', name: 'Changer', password: 'Original123!' };

    it('401 when unauthenticated', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/change-password')
        .send({ currentPassword: 'x', newPassword: 'whatever123' });
      expect(res.status).toBe(401);
    });

    it('401 on a wrong currentPassword; the password is unchanged', async () => {
      const cookie = authCookie(await signup(CP_USER));
      const res = await change(cookie, {
        currentPassword: 'WrongPassword1',
        newPassword: 'NextSecret123',
      });
      expect(res.status).toBe(401);
      // Original still works.
      expect((await login(CP_USER.email, CP_USER.password)).status).toBe(200);
    });

    it('422 on a too-short newPassword', async () => {
      const cookie = authCookie(await login(CP_USER.email, CP_USER.password));
      const res = await change(cookie, { currentPassword: CP_USER.password, newPassword: 'short' });
      expect(res.status).toBe(422);
    });

    it('200 with the correct currentPassword; new password logs in, old one does not', async () => {
      const cookie = authCookie(await login(CP_USER.email, CP_USER.password));
      const next = 'RotatedSecret9';
      const res = await change(cookie, { currentPassword: CP_USER.password, newPassword: next });
      expect(res.status).toBe(200);

      expect((await login(CP_USER.email, next)).status).toBe(200);
      expect((await login(CP_USER.email, CP_USER.password)).status).toBe(401);
    });
  });
});
