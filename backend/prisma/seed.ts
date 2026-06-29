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
  { sku: 'CAP-001', name: 'Trucker Cap', description: 'Classic five-panel trucker cap with a breathable mesh back.', priceCents: 1699, category: 'Apparel', stock: 110 },
  { sku: 'JEAN-001', name: 'Slim-Fit Jeans', description: 'Mid-rise stretch denim in a versatile slim fit.', priceCents: 5499, category: 'Apparel', stock: 65 },
  { sku: 'SUNG-001', name: 'Polarized Sunglasses', description: 'UV400 polarized lenses in a timeless acetate frame.', priceCents: 3999, category: 'Apparel', stock: 70 },
  // Home
  { sku: 'MUG-001', name: 'Stoneware Mug', description: 'Hand-glazed 12oz stoneware mug, microwave safe.', priceCents: 1450, category: 'Home', stock: 80 },
  { sku: 'CNDL-001', name: 'Soy Wax Candle', description: 'Hand-poured soy candle with a cedar & sage scent.', priceCents: 1800, category: 'Home', stock: 3 }, // intentionally low stock (edge-case demos)
  { sku: 'TOWL-001', name: 'Linen Hand Towel', description: 'Stonewashed pure-linen hand towel, quick drying.', priceCents: 2200, category: 'Home', stock: 45 },
  { sku: 'PLNT-001', name: 'Ceramic Planter', description: 'Glazed ceramic planter with a drainage tray, fits 4in pots.', priceCents: 1650, category: 'Home', stock: 95 },
  { sku: 'BOWL-001', name: 'Stoneware Bowl Set', description: 'Set of four reactive-glaze stoneware bowls, dishwasher safe.', priceCents: 3899, category: 'Home', stock: 50 },
  // Electronics
  { sku: 'BUDS-001', name: 'Wireless Earbuds', description: 'Bluetooth 5.3 earbuds with active noise cancellation.', priceCents: 7999, category: 'Electronics', stock: 35 },
  { sku: 'LAMP-001', name: 'LED Desk Lamp', description: 'Dimmable LED desk lamp with adjustable color temperature.', priceCents: 3499, category: 'Electronics', stock: 22 },
  { sku: 'CHRG-001', name: 'USB-C Charger', description: '65W GaN fast charger with two USB-C ports.', priceCents: 2599, category: 'Electronics', stock: 150 },
  { sku: 'KEYB-001', name: 'Wireless Keyboard', description: 'Low-profile wireless keyboard with a rechargeable battery.', priceCents: 5999, category: 'Electronics', stock: 40 },
  { sku: 'MOUS-001', name: 'Wireless Mouse', description: 'Ergonomic 2.4GHz wireless mouse with silent clicks.', priceCents: 2899, category: 'Electronics', stock: 85 },
  { sku: 'SPKR-001', name: 'Bluetooth Speaker', description: 'Portable IPX7 waterproof speaker with 12-hour playtime.', priceCents: 6499, category: 'Electronics', stock: 30 },
  { sku: 'WTCH-001', name: 'Smart Watch', description: 'Fitness smartwatch with heart-rate tracking and GPS.', priceCents: 9999, category: 'Electronics', stock: 25 },
  // Books
  { sku: 'BOOK-001', name: 'The Pragmatic Shelf', description: 'A bestselling novel about craft, patience, and woodwork.', priceCents: 1599, category: 'Books', stock: 75 },
  { sku: 'BOOK-002', name: 'Cooking with Pine', description: 'Seasonal recipes for the adventurous home cook.', priceCents: 2499, category: 'Books', stock: 40 },
  // Outdoors
  { sku: 'BOTL-001', name: 'Insulated Water Bottle', description: 'Double-walled steel bottle keeps drinks cold for 24h.', priceCents: 2999, category: 'Outdoors', stock: 90 },
  { sku: 'BPK-001', name: 'Trail Daypack', description: '22L weather-resistant daypack with a padded laptop sleeve.', priceCents: 5999, category: 'Outdoors', stock: 18 },
  { sku: 'TENT-001', name: '2-Person Tent', description: 'Lightweight three-season backpacking tent.', priceCents: 12999, category: 'Outdoors', stock: 8 },
  { sku: 'STOOL-001', name: 'Folding Camp Stool', description: 'Compact tripod camp stool with a packable carry strap.', priceCents: 3299, category: 'Outdoors', stock: 55 },
];

/**
 * Curated Unsplash product photo per SKU. Each ID was visually verified to match
 * the product. Sizing/crop is applied via query params so all images are uniform.
 */
const IMAGE_IDS: Record<string, string> = {
  'TEE-001': 'photo-1521572163474-6864f9cf17ab', // white cotton tee
  'HOOD-001': 'photo-1556821840-3a63f95609a7', // grey fleece hoodie
  'SOCK-001': 'photo-1586350977771-b3b0abd50c82', // patterned socks
  'MUG-001': 'photo-1514228742587-6b1558fcca3d', // stoneware mug
  'CNDL-001': 'photo-1602874801007-bd458bb1b8b6', // lit soy candle
  'TOWL-001': 'photo-1728034261564-18930dcb2c8e', // folded linen towels
  'BUDS-001': 'photo-1606220588913-b3aacb4d2f46', // wireless earbuds
  'LAMP-001': 'photo-1507473885765-e6ed057f782c', // LED desk lamp
  'CHRG-001': 'photo-1600490722773-35753aea6332', // USB charger
  'BOOK-001': 'photo-1544947950-fa07a98d237f', // hardcover book
  'BOOK-002': 'photo-1466637574441-749b8f19452f', // cooking ingredients
  'BOTL-001': 'photo-1602143407151-7111542de6e8', // insulated water bottle
  'BPK-001': 'photo-1553062407-98eeb64c6a62', // daypack backpack
  'TENT-001': 'photo-1504280390367-361c6d9f38f4', // backpacking tent
  'CAP-001': 'photo-1588850561407-ed78c282e89b', // trucker cap
  'JEAN-001': 'photo-1542272604-787c3835535d', // folded jeans
  'SUNG-001': 'photo-1572635196237-14b3f281503f', // polarized sunglasses
  'PLNT-001': 'photo-1485955900006-10f4d324d411', // ceramic planter
  'BOWL-001': 'photo-1578749556568-bc2c40e68b61', // stoneware bowl set
  'KEYB-001': 'photo-1587829741301-dc798b83add3', // wireless keyboard
  'MOUS-001': 'photo-1527814050087-3793815479db', // wireless mouse
  'SPKR-001': 'photo-1608043152269-423dbba4e7e1', // bluetooth speaker
  'WTCH-001': 'photo-1523275335684-37898b6baf30', // smart watch
  'STOOL-001': 'photo-1503602642458-232111445657', // folding camp stool
};

const imageFor = (sku: string): string => {
  const id = IMAGE_IDS[sku];
  if (!id) throw new Error(`Seed error: no image mapped for SKU ${sku}`);
  return `https://images.unsplash.com/${id}?w=600&h=400&fit=crop&q=80`;
};

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
