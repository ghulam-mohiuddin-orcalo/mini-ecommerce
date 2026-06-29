/**
 * Idempotent seed script.
 *
 * Running it repeatedly converges to the same state:
 *  - Users are upserted by their unique email.
 *  - Products are upserted by their unique SKU.
 *  - The demo customer's orders + cart are reset (delete + recreate) each run, so
 *    historical demo data never accumulates duplicates.
 *
 * Money is in integer cents throughout. Order items snapshot product fields.
 */
import { PrismaClient, OrderStatus, Role, type Product } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number): Date => new Date(Date.now() - n * DAY_MS);

const ADMIN_EMAIL = 'admin@shop.test';
const CUSTOMER_EMAIL = 'customer@shop.test';

interface ProductSeed {
  sku: string;
  name: string;
  description: string;
  priceCents: number;
  category: string;
  stock: number;
}

const PRODUCTS: ProductSeed[] = [
  // Apparel
  { sku: 'TEE-001', name: 'Classic Cotton Tee', description: 'A soft, breathable everyday t-shirt in pre-shrunk cotton.', priceCents: 1999, category: 'Apparel', stock: 120 },
  { sku: 'HOOD-001', name: 'Pine Fleece Hoodie', description: 'Cozy brushed-fleece hoodie with a roomy front pocket.', priceCents: 4500, category: 'Apparel', stock: 60 },
  { sku: 'SOCK-001', name: 'Merino Wool Socks', description: 'Temperature-regulating merino socks, pack of three.', priceCents: 1290, category: 'Apparel', stock: 200 },
  // Home
  { sku: 'MUG-001', name: 'Stoneware Mug', description: 'Hand-glazed 12oz stoneware mug, microwave safe.', priceCents: 1450, category: 'Home', stock: 80 },
  { sku: 'CNDL-001', name: 'Soy Wax Candle', description: 'Hand-poured soy candle with a cedar & sage scent.', priceCents: 1800, category: 'Home', stock: 3 }, // intentionally low stock (edge-case demos)
  { sku: 'TOWL-001', name: 'Linen Hand Towel', description: 'Stonewashed pure-linen hand towel, quick drying.', priceCents: 2200, category: 'Home', stock: 45 },
  // Electronics
  { sku: 'BUDS-001', name: 'Wireless Earbuds', description: 'Bluetooth 5.3 earbuds with active noise cancellation.', priceCents: 7999, category: 'Electronics', stock: 35 },
  { sku: 'LAMP-001', name: 'LED Desk Lamp', description: 'Dimmable LED desk lamp with adjustable color temperature.', priceCents: 3499, category: 'Electronics', stock: 22 },
  { sku: 'CHRG-001', name: 'USB-C Charger', description: '65W GaN fast charger with two USB-C ports.', priceCents: 2599, category: 'Electronics', stock: 150 },
  // Books
  { sku: 'BOOK-001', name: 'The Pragmatic Shelf', description: 'A bestselling novel about craft, patience, and woodwork.', priceCents: 1599, category: 'Books', stock: 75 },
  { sku: 'BOOK-002', name: 'Cooking with Pine', description: 'Seasonal recipes for the adventurous home cook.', priceCents: 2499, category: 'Books', stock: 40 },
  // Outdoors
  { sku: 'BOTL-001', name: 'Insulated Water Bottle', description: 'Double-walled steel bottle keeps drinks cold for 24h.', priceCents: 2999, category: 'Outdoors', stock: 90 },
  { sku: 'BPK-001', name: 'Trail Daypack', description: '22L weather-resistant daypack with a padded laptop sleeve.', priceCents: 5999, category: 'Outdoors', stock: 18 },
  { sku: 'TENT-001', name: '2-Person Tent', description: 'Lightweight three-season backpacking tent.', priceCents: 12999, category: 'Outdoors', stock: 8 },
];

/** Deterministic demo image per product (seeded so it's stable across runs). */
const imageFor = (sku: string): string => `https://picsum.photos/seed/${sku}/600/400`;

interface OrderSeed {
  status: OrderStatus;
  createdAt: Date;
  paid: boolean;
  lines: { sku: string; quantity: number }[];
}

const ORDERS: OrderSeed[] = [
  { status: OrderStatus.DELIVERED, createdAt: daysAgo(20), paid: true, lines: [{ sku: 'HOOD-001', quantity: 1 }, { sku: 'SOCK-001', quantity: 2 }] },
  { status: OrderStatus.CANCELLED, createdAt: daysAgo(15), paid: true, lines: [{ sku: 'TENT-001', quantity: 1 }] },
  { status: OrderStatus.SHIPPED, createdAt: daysAgo(8), paid: true, lines: [{ sku: 'BUDS-001', quantity: 1 }] },
  { status: OrderStatus.PROCESSING, createdAt: daysAgo(3), paid: true, lines: [{ sku: 'LAMP-001', quantity: 1 }, { sku: 'CHRG-001', quantity: 1 }] },
  { status: OrderStatus.PENDING, createdAt: daysAgo(1), paid: true, lines: [{ sku: 'BOOK-001', quantity: 2 }] },
];

const CART_LINES: { sku: string; quantity: number }[] = [
  { sku: 'MUG-001', quantity: 1 },
  { sku: 'TEE-001', quantity: 2 },
];

async function main(): Promise<void> {
  // 1) Users (upsert by unique email) -------------------------------------------------
  const [adminHash, customerHash] = await Promise.all([
    bcrypt.hash('Admin123!', SALT_ROUNDS),
    bcrypt.hash('Customer123!', SALT_ROUNDS),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { name: 'Site Admin', role: Role.ADMIN, passwordHash: adminHash },
    create: { email: ADMIN_EMAIL, name: 'Site Admin', role: Role.ADMIN, passwordHash: adminHash },
  });

  const customer = await prisma.user.upsert({
    where: { email: CUSTOMER_EMAIL },
    update: { name: 'Casey Customer', role: Role.CUSTOMER, passwordHash: customerHash },
    create: { email: CUSTOMER_EMAIL, name: 'Casey Customer', role: Role.CUSTOMER, passwordHash: customerHash },
  });

  // 2) Products (upsert by unique SKU) ------------------------------------------------
  for (const p of PRODUCTS) {
    const data = {
      name: p.name,
      description: p.description,
      priceCents: p.priceCents,
      imageUrl: imageFor(p.sku),
      category: p.category,
      stock: p.stock,
      isActive: true,
    };
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: data,
      create: { sku: p.sku, ...data },
    });
  }

  const products = await prisma.product.findMany();
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const requireProduct = (sku: string): Product => {
    const product = bySku.get(sku);
    if (!product) throw new Error(`Seed error: unknown SKU ${sku}`);
    return product;
  };

  // 3) Reset + recreate the demo customer's orders and cart (idempotent) --------------
  // Cascades remove child order items / cart items.
  await prisma.$transaction([
    prisma.order.deleteMany({ where: { userId: customer.id } }),
    prisma.cart.deleteMany({ where: { userId: customer.id } }),
  ]);

  for (const order of ORDERS) {
    const items = order.lines.map((line) => {
      const product = requireProduct(line.sku);
      return {
        productId: product.id,
        productName: product.name,
        productImageUrl: product.imageUrl,
        productCategory: product.category,
        unitPriceCents: product.priceCents,
        quantity: line.quantity,
      };
    });
    const totalCents = items.reduce((sum, it) => sum + it.unitPriceCents * it.quantity, 0);

    await prisma.order.create({
      data: {
        userId: customer.id,
        status: order.status,
        totalCents,
        paymentRef: order.paid ? `mock_${order.createdAt.getTime()}` : null,
        paidAt: order.paid ? order.createdAt : null,
        createdAt: order.createdAt,
        items: { create: items },
      },
    });
  }

  await prisma.cart.create({
    data: {
      userId: customer.id,
      items: {
        create: CART_LINES.map((line) => {
          const product = requireProduct(line.sku);
          return { productId: product.id, quantity: line.quantity };
        }),
      },
    },
  });

  // 4) Report -------------------------------------------------------------------------
  const [userCount, productCount, orderCount, orderItemCount, cartCount, cartItemCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.cart.count(),
      prisma.cartItem.count(),
    ]);

  /* eslint-disable no-console */
  console.log('Seed complete:');
  console.log(`  users:       ${userCount} (admin: ${admin.email}, customer: ${customer.email})`);
  console.log(`  products:    ${productCount}`);
  console.log(`  orders:      ${orderCount} (+ ${orderItemCount} order items)`);
  console.log(`  carts:       ${cartCount} (+ ${cartItemCount} cart items)`);
  /* eslint-enable no-console */
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
