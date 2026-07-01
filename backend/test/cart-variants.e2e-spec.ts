import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Cart variant semantics e2e. Proves that a product with variants yields one cart LINE per
 * chosen variant (not a merged line), that removeItem with ?variantId pins the right line, that a
 * missing/inactive/foreign variant is rejected, and that the line's price/stock/availability are
 * the VARIANT's — not the parent product's.
 */
describe('Cart variants (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie = '';

  // Parent product carries its own (product-level) price/stock; the variants override both.
  const PRODUCT_PRICE = 5000;
  const PRODUCT_STOCK = 100;
  const VAR_S_PRICE = 4500;
  const VAR_S_STOCK = 4;
  const VAR_L_PRICE = 4800;
  const VAR_L_STOCK = 7;

  let productId = '';
  let variantSId = '';
  let variantLId = '';
  let inactiveVariantId = '';
  let otherProductId = '';
  let otherVariantId = '';

  const authCookie = (res: request.Response): string => {
    const arr = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const token = arr.find((c) => c.startsWith('access_token='));
    return token ? token.split(';')[0] : '';
  };

  const add = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/cart/items').set('Cookie', cookie).send(body);
  const getCart = () => request(app.getHttpServer()).get('/cart').set('Cookie', cookie);
  const clearCart = () => request(app.getHttpServer()).delete('/cart').set('Cookie', cookie);

  interface CartLine {
    productId: string;
    variantId: string | null;
    variantLabel: string | null;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
    stock: number;
    available: boolean;
  }
  const lines = (res: request.Response): CartLine[] => res.body.items as CartLine[];

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

    const product = await prisma.product.create({
      data: {
        sku: 'CV-1', name: 'Variant Tee', description: 'x', priceCents: PRODUCT_PRICE,
        imageUrl: 'x', categoryId: apparelCat.id, stock: PRODUCT_STOCK, isActive: true,
        variants: {
          create: [
            { sku: 'CV-1-S', label: 'Small', size: 'S', priceCents: VAR_S_PRICE, stock: VAR_S_STOCK, position: 0, isActive: true },
            { sku: 'CV-1-L', label: 'Large', size: 'L', priceCents: VAR_L_PRICE, stock: VAR_L_STOCK, position: 1, isActive: true },
            { sku: 'CV-1-XL', label: 'XL (gone)', size: 'XL', priceCents: 4900, stock: 5, position: 2, isActive: false },
          ],
        },
      },
      include: { variants: { orderBy: { position: 'asc' } } },
    });
    productId = product.id;
    variantSId = product.variants[0].id;
    variantLId = product.variants[1].id;
    inactiveVariantId = product.variants[2].id;

    const other = await prisma.product.create({
      data: {
        sku: 'CV-2', name: 'Other', description: 'x', priceCents: 1000, imageUrl: 'x',
        categoryId: apparelCat.id, stock: 50, isActive: true,
        variants: { create: [{ sku: 'CV-2-A', label: 'A', priceCents: 1000, stock: 5, isActive: true }] },
      },
      include: { variants: true },
    });
    otherProductId = other.id;
    otherVariantId = other.variants[0].id;

    cookie = authCookie(
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'cartvariant@shop.test', name: 'CV', password: 'Password123!' }),
    );
  });

  afterAll(async () => {
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    await clearCart();
  });

  it('two different variants of one product create two separate lines', async () => {
    await add({ productId, variantId: variantSId, quantity: 1 });
    const res = await add({ productId, variantId: variantLId, quantity: 2 });

    const items = lines(res);
    expect(items).toHaveLength(2);
    const small = items.find((i) => i.variantId === variantSId);
    const large = items.find((i) => i.variantId === variantLId);
    expect(small).toBeDefined();
    expect(large).toBeDefined();
    expect(small?.quantity).toBe(1);
    expect(large?.quantity).toBe(2);
  });

  it("a line's price/stock/label reflect the chosen variant, not the parent product", async () => {
    const res = await add({ productId, variantId: variantSId, quantity: 2 });
    const small = lines(res).find((i) => i.variantId === variantSId);
    expect(small?.unitPriceCents).toBe(VAR_S_PRICE); // variant price, not PRODUCT_PRICE
    expect(small?.stock).toBe(VAR_S_STOCK); // variant stock, not PRODUCT_STOCK
    expect(small?.variantLabel).toBe('Small');
    expect(small?.lineTotalCents).toBe(VAR_S_PRICE * 2);
    expect(small?.available).toBe(true);
  });

  it('re-adding the SAME variant merges into one line (no duplicate)', async () => {
    await add({ productId, variantId: variantSId, quantity: 1 });
    const res = await add({ productId, variantId: variantSId, quantity: 2 });
    const matching = lines(res).filter((i) => i.variantId === variantSId);
    expect(matching).toHaveLength(1);
    expect(matching[0].quantity).toBe(3);
  });

  it('removeItem with ?variantId removes only that variant line', async () => {
    await add({ productId, variantId: variantSId, quantity: 1 });
    await add({ productId, variantId: variantLId, quantity: 1 });

    const res = await request(app.getHttpServer())
      .delete(`/cart/items/${productId}?variantId=${variantSId}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);

    const items = lines(res);
    expect(items).toHaveLength(1);
    expect(items[0].variantId).toBe(variantLId);
  });

  it('removeItem WITHOUT variantId does not remove a variant line (it targets the variant-less line)', async () => {
    await add({ productId, variantId: variantSId, quantity: 1 });
    // No variant-less line exists, so a variantId-less delete is a no-op against the variant line.
    const res = await request(app.getHttpServer())
      .delete(`/cart/items/${productId}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(lines(res)).toHaveLength(1);
    expect(lines(res)[0].variantId).toBe(variantSId);
  });

  it('rejects a missing variant id with 404', async () => {
    expect((await add({ productId, variantId: 'does-not-exist', quantity: 1 })).status).toBe(404);
  });

  it('rejects an inactive variant with 404', async () => {
    expect((await add({ productId, variantId: inactiveVariantId, quantity: 1 })).status).toBe(404);
  });

  it("rejects a variant that belongs to another product with 404", async () => {
    expect((await add({ productId, variantId: otherVariantId, quantity: 1 })).status).toBe(404);
    expect((await add({ productId: otherProductId, variantId: variantSId, quantity: 1 })).status).toBe(404);
  });

  it('enforces the VARIANT stock ceiling at 409 (not the larger product stock)', async () => {
    // VAR_S_STOCK is 4; PRODUCT_STOCK is 100. Requesting 5 must fail on the variant ceiling.
    const res = await add({ productId, variantId: variantSId, quantity: VAR_S_STOCK + 1 });
    expect(res.status).toBe(409);
    expect(lines(await getCart())).toHaveLength(0);
  });

  it('merge that crosses the variant stock ceiling is rejected (409) and leaves the line intact', async () => {
    await add({ productId, variantId: variantSId, quantity: VAR_S_STOCK }); // exactly at ceiling
    const res = await add({ productId, variantId: variantSId, quantity: 1 }); // would exceed
    expect(res.status).toBe(409);
    const matching = lines(await getCart()).filter((i) => i.variantId === variantSId);
    expect(matching[0].quantity).toBe(VAR_S_STOCK);
  });
});
