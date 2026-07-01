import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Checkout with variants — the integrity core extended. Proves the variant-stock decrement is
 * transactional and atomic: overselling a variant returns 409 and rolls back BOTH the variant's
 * stock and the parent product's stock (no order, cart untouched). Also covers the variant snapshot
 * on the order item, its durability across later variant edits/deactivation, and the OrderItem.variant
 * Restrict FK that forbids hard-deleting a referenced variant.
 */
describe('Orders with variants (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie = '';
  let adminCookie = '';

  const PRODUCT_PRICE = 5000;
  const PRODUCT_STOCK = 100; // intentionally large to prove the variant ceiling is what bites
  const VAR_PRICE = 4500;
  const VAR_STOCK = 3;

  let productId = '';
  let variantId = '';
  // A separate variant-less product to prove the legacy product-level decrement path is unchanged.
  let plainId = '';
  const PLAIN_STOCK = 4;

  const authCookie = (res: request.Response): string => {
    const arr = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const token = arr.find((c) => c.startsWith('access_token='));
    return token ? token.split(';')[0] : '';
  };
  const add = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/cart/items').set('Cookie', cookie).send(body);
  const checkout = () => request(app.getHttpServer()).post('/orders').set('Cookie', cookie).send({});
  const getCart = () => request(app.getHttpServer()).get('/cart').set('Cookie', cookie);
  const setStatus = (id: string, status: OrderStatus) =>
    request(app.getHttpServer())
      .patch(`/admin/orders/${id}/status`)
      .set('Cookie', adminCookie)
      .send({ status });

  const variantStock = async (id: string): Promise<number> =>
    (await prisma.productVariant.findUniqueOrThrow({ where: { id } })).stock;
  const productStock = async (id: string): Promise<number> =>
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

    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    const apparelCat = await prisma.category.create({ data: { name: 'Apparel', slug: 'apparel', isActive: true } });
    const homeCat = await prisma.category.create({ data: { name: 'Home', slug: 'home', isActive: true } });

    const product = await prisma.product.create({
      data: {
        sku: 'OV-1', name: 'Variant Hoodie', description: 'x', priceCents: PRODUCT_PRICE,
        imageUrl: 'x', categoryId: apparelCat.id, stock: PRODUCT_STOCK, isActive: true,
        variants: { create: [{ sku: 'OV-1-M', label: 'Medium', size: 'M', priceCents: VAR_PRICE, stock: VAR_STOCK, isActive: true }] },
      },
      include: { variants: true },
    });
    productId = product.id;
    variantId = product.variants[0].id;

    plainId = (
      await prisma.product.create({
        data: { sku: 'OV-2', name: 'Plain Mug', description: 'x', priceCents: 1200, imageUrl: 'x', categoryId: homeCat.id, stock: PLAIN_STOCK, isActive: true },
      })
    ).id;

    cookie = authCookie(
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'ordervariant@shop.test', name: 'OV', password: 'Password123!' }),
    );

    await prisma.user.create({
      data: {
        email: 'ov-admin@shop.test',
        name: 'OV Admin',
        role: Role.ADMIN,
        passwordHash: await bcrypt.hash('Admin123!', 12),
      },
    });
    adminCookie = authCookie(
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ov-admin@shop.test', password: 'Admin123!' }),
    );
  });

  afterAll(async () => {
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.cartItem.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.productVariant.update({ where: { id: variantId }, data: { stock: VAR_STOCK, isActive: true, priceCents: VAR_PRICE, label: 'Medium' } });
    await prisma.product.update({ where: { id: productId }, data: { stock: PRODUCT_STOCK, isActive: true } });
    await prisma.product.update({ where: { id: plainId }, data: { stock: PLAIN_STOCK, isActive: true } });
  });

  it('decrements the VARIANT (not the product) on a successful variant checkout', async () => {
    await add({ productId, variantId, quantity: 2 });
    const res = await checkout();

    expect(res.status).toBe(201);
    expect(res.body.totalCents).toBe(VAR_PRICE * 2);
    expect(res.body.items[0]).toMatchObject({
      variantId,
      variantLabel: 'Medium',
      unitPriceCents: VAR_PRICE,
      quantity: 2,
    });

    expect(await variantStock(variantId)).toBe(VAR_STOCK - 2);
    expect(await productStock(productId)).toBe(PRODUCT_STOCK); // parent untouched
    expect((await getCart()).body.items).toHaveLength(0);
  });

  it('variant oversell → 409 and FULL rollback (variant stock, product stock, order, cart all unchanged)', async () => {
    // Cart the variant within stock, then drop variant stock below the cart quantity so the
    // atomic conditional decrement fails inside the transaction.
    await add({ productId, variantId, quantity: 2 });
    await prisma.productVariant.update({ where: { id: variantId }, data: { stock: 1 } });

    const res = await checkout();
    expect(res.status).toBe(409);

    expect(await variantStock(variantId)).toBe(1); // unchanged
    expect(await productStock(productId)).toBe(PRODUCT_STOCK); // never touched
    expect(await prisma.order.count()).toBe(0);
    expect((await getCart()).body.items[0].quantity).toBe(2); // cart intact
  });

  it('rolls back the variant decrement when a LATER variant-less line is short (mid-loop 409)', async () => {
    // First line (variant) decrements; the second line (plain product) then fails on stock,
    // which must roll back the already-applied variant decrement too.
    await add({ productId, variantId, quantity: 2 }); // ok against variant stock 3
    await add({ productId: plainId, quantity: 2 }); // will become short
    await prisma.product.update({ where: { id: plainId }, data: { stock: 1 } });

    const res = await checkout();
    expect(res.status).toBe(409);

    expect(await variantStock(variantId)).toBe(VAR_STOCK); // restored
    expect(await productStock(plainId)).toBe(1); // unchanged
    expect(await prisma.order.count()).toBe(0);
  });

  it('zero-variant path still oversells at 409 with no change (legacy product-level decrement)', async () => {
    await add({ productId: plainId, quantity: 2 });
    await prisma.product.update({ where: { id: plainId }, data: { stock: 1 } });

    const res = await checkout();
    expect(res.status).toBe(409);
    expect(await productStock(plainId)).toBe(1);
    expect(await prisma.order.count()).toBe(0);
  });

  it('rejects checkout when the chosen variant became inactive (409, rollback)', async () => {
    await add({ productId, variantId, quantity: 1 });
    await prisma.productVariant.update({ where: { id: variantId }, data: { isActive: false } });

    const res = await checkout();
    expect(res.status).toBe(409);
    expect(await variantStock(variantId)).toBe(VAR_STOCK);
    expect(await prisma.order.count()).toBe(0);
  });

  it('order item variant snapshot survives later variant deactivation AND edits', async () => {
    await add({ productId, variantId, quantity: 1 });
    const order = (await checkout()).body;

    // Mutate the variant after the order: rename, reprice, deactivate.
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { label: 'Renamed', priceCents: 9999, isActive: false },
    });

    const refetched = await request(app.getHttpServer())
      .get(`/orders/${order.id}`)
      .set('Cookie', cookie);
    expect(refetched.status).toBe(200);
    const item = refetched.body.items[0];
    expect(item.variantId).toBe(variantId);
    expect(item.variantLabel).toBe('Medium'); // snapshot, not 'Renamed'
    expect(item.unitPriceCents).toBe(VAR_PRICE); // snapshot, not 9999
    expect(refetched.body.totalCents).toBe(VAR_PRICE);
  });

  it('a variant referenced by an OrderItem cannot be hard-deleted (Restrict FK)', async () => {
    await add({ productId, variantId, quantity: 1 });
    const order = (await checkout()).body;
    expect(order.items[0].variantId).toBe(variantId);

    // The OrderItem.variant relation uses onDelete: Restrict — deleting the variant must fail.
    let code: string | undefined;
    try {
      await prisma.productVariant.delete({ where: { id: variantId } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) code = e.code;
    }
    expect(code).toBe('P2003'); // foreign key constraint violation

    // The variant (and its order item) are still intact.
    expect(await variantStock(variantId)).toBeGreaterThanOrEqual(0);
    const stillThere = await prisma.productVariant.findUnique({ where: { id: variantId } });
    expect(stillThere).not.toBeNull();
  });

  // MEDIUM-1 fix: cancelling an order restocks the SAME row decremented at checkout — the VARIANT
  // when the line had one, not the parent product. Previously this wrongly incremented the product
  // and left the variant short.
  it('cancelling a VARIANT order restores the VARIANT stock and leaves the product base stock unchanged', async () => {
    await add({ productId, variantId, quantity: 2 });
    const order = (await checkout()).body;
    expect(order.items[0].variantId).toBe(variantId);

    // Checkout decremented the variant, not the product.
    expect(await variantStock(variantId)).toBe(VAR_STOCK - 2);
    expect(await productStock(productId)).toBe(PRODUCT_STOCK);

    // Cancel the PENDING order as admin.
    const cancelled = await setStatus(order.id, OrderStatus.CANCELLED);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe(OrderStatus.CANCELLED);

    // The VARIANT is restocked to its pre-order value; the product base stock never moved.
    expect(await variantStock(variantId)).toBe(VAR_STOCK);
    expect(await productStock(productId)).toBe(PRODUCT_STOCK);
  });

  it('cancelling from PROCESSING also restocks the variant (not the product)', async () => {
    await add({ productId, variantId, quantity: 1 });
    const order = (await checkout()).body;
    expect(await variantStock(variantId)).toBe(VAR_STOCK - 1);

    expect((await setStatus(order.id, OrderStatus.PROCESSING)).status).toBe(200);
    // Still short while processing (not yet cancelled).
    expect(await variantStock(variantId)).toBe(VAR_STOCK - 1);

    const cancelled = await setStatus(order.id, OrderStatus.CANCELLED);
    expect(cancelled.status).toBe(200);
    expect(await variantStock(variantId)).toBe(VAR_STOCK); // restored
    expect(await productStock(productId)).toBe(PRODUCT_STOCK); // untouched throughout
  });

  it('a variant-less line still restocks the PRODUCT on cancellation (legacy path unchanged)', async () => {
    await add({ productId: plainId, quantity: 2 });
    const order = (await checkout()).body;
    expect(await productStock(plainId)).toBe(PLAIN_STOCK - 2);

    expect((await setStatus(order.id, OrderStatus.CANCELLED)).status).toBe(200);
    expect(await productStock(plainId)).toBe(PLAIN_STOCK); // restored on the product row
  });
});
