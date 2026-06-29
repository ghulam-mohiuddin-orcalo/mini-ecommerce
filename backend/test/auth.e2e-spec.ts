import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Auth & authorization e2e tests. Runs against a dedicated test database
 * (DATABASE_URL is pointed at it by the test runner). Covers the scenarios in the
 * Milestone 2 brief: signup/login, invalid credentials, invalid/expired JWT, logout,
 * and role-based access control.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const ADMIN = { email: 'e2e-admin@shop.test', password: 'Admin123!', name: 'E2E Admin' };
  const CUSTOMER = { email: 'e2e-cust@shop.test', password: 'Customer123!', name: 'E2E Customer' };

  /** Pull the Set-Cookie header array off a response (for asserting attributes). */
  const cookiesOf = (res: request.Response): string[] =>
    (res.headers['set-cookie'] as unknown as string[]) ?? [];

  /**
   * Extract just the `access_token=<value>` pair to re-send as a Cookie header — the way a
   * browser does. Re-sending the full Set-Cookie string (with Expires commas / attributes)
   * would corrupt the Cookie header.
   */
  const authCookie = (res: request.Response): string => {
    const token = cookiesOf(res).find((c) => c.startsWith('access_token='));
    return token ? token.split(';')[0] : '';
  };

  beforeAll(async () => {
    // Safety: this suite truncates tables. Refuse to run against anything but a *test* DB.
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error(
        'Refusing to run e2e tests: DATABASE_URL must point at a test database (name containing "test").',
      );
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser()); // mirrors main.ts so the cookie strategy can read the token
    await app.init();

    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    // Clean slate (FK-safe order) + a known admin to test role gating.
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: {
        email: ADMIN.email,
        name: ADMIN.name,
        role: Role.ADMIN,
        passwordHash: await bcrypt.hash(ADMIN.password, 12),
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('signup', () => {
    it('creates a customer, sets an httpOnly cookie, and never returns the password hash', async () => {
      const res = await request(app.getHttpServer()).post('/auth/signup').send(CUSTOMER);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ email: CUSTOMER.email, role: Role.CUSTOMER });
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(res.body).not.toHaveProperty('password');

      const cookie = cookiesOf(res).join(';');
      expect(cookie).toContain('access_token=');
      expect(cookie.toLowerCase()).toContain('httponly');
    });

    it('rejects a duplicate email with 409', async () => {
      const res = await request(app.getHttpServer()).post('/auth/signup').send(CUSTOMER);
      expect(res.status).toBe(409);
    });

    it('rejects invalid input with 422', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'not-an-email', name: 'x', password: 'short' });
      expect(res.status).toBe(422);
      expect(Array.isArray(res.body.message)).toBe(true);
    });
  });

  describe('login', () => {
    it('rejects wrong password with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: CUSTOMER.email, password: 'wrong-password' });
      expect(res.status).toBe(401);
    });

    it('accepts valid credentials and sets a cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: CUSTOMER.email, password: CUSTOMER.password });
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(CUSTOMER.email);
      expect(cookiesOf(res).join(';')).toContain('access_token=');
    });
  });

  describe('/auth/me', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app.getHttpServer()).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns the current user with a valid cookie', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: CUSTOMER.email, password: CUSTOMER.password });
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', authCookie(login));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ email: CUSTOMER.email, role: Role.CUSTOMER });
    });

    it('returns 401 for a malformed token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', ['access_token=this.is.garbage']);
      expect(res.status).toBe(401);
    });

    it('returns 401 for an expired token', async () => {
      const user = await prisma.user.findUniqueOrThrow({ where: { email: CUSTOMER.email } });
      const expired = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '-1s' },
      );
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', [`access_token=${expired}`]);
      expect(res.status).toBe(401);
    });
  });

  describe('role-based access control', () => {
    const loginAs = async (creds: { email: string; password: string }): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: creds.email, password: creds.password });
      return authCookie(res);
    };

    it('forbids a customer from the admin-only /users endpoint (403)', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Cookie', await loginAs(CUSTOMER));
      expect(res.status).toBe(403);
    });

    it('allows an admin to access /users (200) and never leaks password hashes', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Cookie', await loginAs(ADMIN));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const u of res.body) {
        expect(u).not.toHaveProperty('passwordHash');
      }
    });

    it('rejects an unauthenticated request to /users with 401', async () => {
      const res = await request(app.getHttpServer()).get('/users');
      expect(res.status).toBe(401);
    });
  });

  describe('logout', () => {
    it('clears the auth cookie', async () => {
      const res = await request(app.getHttpServer()).post('/auth/logout');
      expect(res.status).toBe(200);
      // The cleared cookie is sent back with an empty value / immediate expiry.
      expect(cookiesOf(res).join(';')).toContain('access_token=;');
    });
  });
});
