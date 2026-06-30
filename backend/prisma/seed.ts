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
import { PrismaClient, OrderStatus, Role, ArticleStatus, type Product } from '@prisma/client';
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

const unsplashUrl = (id: string): string =>
  `https://images.unsplash.com/${id}?w=600&h=400&fit=crop&q=80`;

const imageFor = (sku: string): string => {
  const id = IMAGE_IDS[sku];
  if (!id) throw new Error(`Seed error: no image mapped for SKU ${sku}`);
  return unsplashUrl(id);
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

// --- Storefront enrichment seed data (all money in integer cents) ---------------------

// A couple of products go on sale: compareAtPriceCents is the strike-through "was" price
// (must be > priceCents for the derived Sale badge to make sense).
const SALE_PRICES: Record<string, number> = {
  'HOOD-001': 5500, // was $55.00, now $45.00
  'BUDS-001': 9999, // was $99.99, now $79.99
  'LAMP-001': 4299, // was $42.99, now $34.99
};

// Extra gallery images per product (the product's primary imageUrl stays position 0).
// Reuse curated Unsplash ids so the gallery is visually coherent.
const GALLERY: Record<string, string[]> = {
  'TEE-001': ['photo-1503341504253-dff4815485f1', 'photo-1562157873-818bc0726f68'],
  'HOOD-001': ['photo-1620799140408-edc6dcb6d633', 'photo-1578768079052-aa76e52ff62e'],
  'BUDS-001': ['photo-1590658268037-6bf12165a8df', 'photo-1572569511254-d8f925fe2cbb'],
  'LAMP-001': ['photo-1517991104123-1d56a6e81ed9', 'photo-1565636192335-99e466d5e92a'],
  'WTCH-001': ['photo-1579586337278-3befd40fd17a', 'photo-1508685096489-7aacd43bd3b1'],
};

// Variant-bearing products. priceCents/stock are per-variant (override the base product).
// Each variant's sku is its idempotent upsert key.
interface VariantSeed {
  sku: string; // variant sku (unique)
  label: string;
  color?: string;
  size?: string;
  priceCents: number;
  stock: number;
  position: number;
}
const VARIANTS: Record<string, VariantSeed[]> = {
  // Apparel tee in three sizes (same price), distinct stock levels.
  'TEE-001': [
    { sku: 'TEE-001-S', label: 'White / S', color: 'White', size: 'S', priceCents: 1999, stock: 40, position: 0 },
    { sku: 'TEE-001-M', label: 'White / M', color: 'White', size: 'M', priceCents: 1999, stock: 55, position: 1 },
    { sku: 'TEE-001-L', label: 'White / L', color: 'White', size: 'L', priceCents: 1999, stock: 25, position: 2 },
  ],
  // Hoodie in two colors; the colored variant carries a small upcharge.
  'HOOD-001': [
    { sku: 'HOOD-001-GRY-M', label: 'Grey / M', color: 'Grey', size: 'M', priceCents: 4500, stock: 30, position: 0 },
    { sku: 'HOOD-001-GRY-L', label: 'Grey / L', color: 'Grey', size: 'L', priceCents: 4500, stock: 20, position: 1 },
    { sku: 'HOOD-001-PIN-M', label: 'Pine / M', color: 'Pine', size: 'M', priceCents: 4800, stock: 10, position: 2 },
  ],
};

// Reviews from the demo customer. Only on products they have a DELIVERED order for, so
// "verified purchase" eligibility holds. (HOOD-001 + SOCK-001 are in the DELIVERED order.)
interface ReviewSeed {
  sku: string;
  rating: number; // 1..5
  title: string;
  body: string;
  daysAgo: number;
}
const REVIEWS: ReviewSeed[] = [
  { sku: 'HOOD-001', rating: 5, title: 'Incredibly cozy', body: 'The fleece is brushed soft and the pocket is huge. Wearing it daily.', daysAgo: 12 },
  { sku: 'SOCK-001', rating: 4, title: 'Warm and well-made', body: 'Merino keeps my feet comfortable all day. Wish the pack had four pairs.', daysAgo: 10 },
];

// A couple of saved addresses for the demo customer; exactly one default.
interface AddressSeed {
  label: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
  isDefault: boolean;
}
const ADDRESSES: AddressSeed[] = [
  { label: 'Home', fullName: 'Casey Customer', line1: '14 Maple Avenue', line2: 'Flat 2', city: 'Bristol', postcode: 'BS1 4DJ', country: 'United Kingdom', isDefault: true },
  { label: 'Work', fullName: 'Casey Customer', line1: '200 Tech Park Road', city: 'Bristol', postcode: 'BS2 9XX', country: 'United Kingdom', isDefault: false },
];

// Wishlist: products the demo customer is eyeing (not yet owned).
const WISHLIST_SKUS: string[] = ['WTCH-001', 'SPKR-001', 'TENT-001'];

// CMS: one blog/article category + a few published articles.
const ARTICLE_CATEGORY = { slug: 'guides', name: 'Guides & Stories' };
interface ArticleSeed {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover: string; // unsplash id
  author: string;
  publishedDaysAgo: number;
}
const ARTICLES: ArticleSeed[] = [
  {
    slug: 'choosing-the-right-daypack',
    title: 'Choosing the Right Daypack for Every Trail',
    excerpt: 'Capacity, fit, and weatherproofing — what actually matters when you pick a pack.',
    body: 'A good daypack disappears on your back. Start with capacity: 18–24L covers most day hikes...\n\nFit comes next — adjustable sternum straps and a padded back panel make the difference on long descents.',
    cover: 'photo-1553062407-98eeb64c6a62',
    author: 'Site Admin',
    publishedDaysAgo: 18,
  },
  {
    slug: 'caring-for-merino-wool',
    title: 'How to Care for Merino Wool So It Lasts',
    excerpt: 'Merino is tougher than people think. A few simple habits keep it fresh for years.',
    body: 'Wash cold, inside out, on a gentle cycle. Skip the fabric softener — it coats the fibres...\n\nAir-dry flat. Merino naturally resists odour, so you can wear it several times between washes.',
    cover: 'photo-1586350977771-b3b0abd50c82',
    author: 'Site Admin',
    publishedDaysAgo: 11,
  },
  {
    slug: 'desk-setup-essentials',
    title: 'Five Desk Setup Essentials Under $60',
    excerpt: 'Small upgrades that make a workspace calmer and more productive.',
    body: 'Lighting first: a dimmable lamp with adjustable colour temperature reduces eye strain...\n\nA low-profile wireless keyboard and a silent mouse round out a tidy, cable-light desk.',
    cover: 'photo-1507473885765-e6ed057f782c',
    author: 'Site Admin',
    publishedDaysAgo: 5,
  },
  {
    slug: 'soy-candles-explained',
    title: 'Why We Use Soy Wax in Our Candles',
    excerpt: 'Cleaner burn, longer life, and a scent throw that fills the room.',
    body: 'Soy wax burns cooler than paraffin, so a candle lasts noticeably longer...\n\nIt also holds fragrance oils well, giving a steady cedar-and-sage scent from first light to last.',
    cover: 'photo-1602874801007-bd458bb1b8b6',
    author: 'Site Admin',
    publishedDaysAgo: 2,
  },
];

// FAQ: two categories with several items each.
interface FaqCategorySeed {
  slug: string;
  name: string;
  position: number;
  items: { question: string; body: string }[];
}
const FAQ_CATEGORIES: FaqCategorySeed[] = [
  {
    slug: 'orders-shipping',
    name: 'Orders & Shipping',
    position: 0,
    items: [
      { question: 'How long does delivery take?', body: 'Standard delivery is 3–5 working days. Express options are shown at checkout.' },
      { question: 'Can I track my order?', body: 'Yes — once an order ships you can follow its status from your account under Orders.' },
      { question: 'Do you ship internationally?', body: 'We currently ship within the UK. International shipping is coming soon.' },
    ],
  },
  {
    slug: 'returns-refunds',
    name: 'Returns & Refunds',
    position: 1,
    items: [
      { question: 'What is your returns window?', body: 'You can return unused items within 30 days of delivery for a full refund.' },
      { question: 'How do refunds work?', body: 'Refunds are issued to your original payment method within 5–7 working days of us receiving the return.' },
    ],
  },
];

// Static content pages (About / policies). `key` is the idempotent upsert key.
interface ContentBlockSeed {
  key: string;
  title: string;
  body: string;
}
const CONTENT_BLOCKS: ContentBlockSeed[] = [
  { key: 'about', title: 'About Us', body: 'We are a small team building a calm, considered shop. Every product is chosen for everyday usefulness and built to last.' },
  { key: 'privacy', title: 'Privacy Policy', body: 'We collect only what we need to fulfil your orders and improve the shop. We never sell your data. Contact us to access or delete your information.' },
  { key: 'terms', title: 'Terms of Service', body: 'By using this site you agree to shop responsibly and to our order, payment, and returns policies described across these pages.' },
  { key: 'shipping', title: 'Shipping Information', body: 'Standard UK delivery is 3–5 working days. Orders placed before 2pm typically dispatch the same working day.' },
  { key: 'returns', title: 'Returns Policy', body: 'Unused items can be returned within 30 days of delivery. Refunds reach your original payment method within 5–7 working days.' },
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
    // compareAtPriceCents is the "was" price; null clears any prior sale on re-seed.
    const compareAtPriceCents = SALE_PRICES[p.sku] ?? null;
    const data = {
      name: p.name,
      description: p.description,
      priceCents: p.priceCents,
      compareAtPriceCents,
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

  // 2a) Product gallery images (idempotent: reset per product, then recreate) ----------
  // ProductImage has no natural unique key, so we clear a product's gallery and rebuild it.
  for (const [sku, ids] of Object.entries(GALLERY)) {
    const product = requireProduct(sku);
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.createMany({
      data: ids.map((id, index) => ({
        productId: product.id,
        url: unsplashUrl(id),
        alt: `${product.name} — view ${index + 2}`,
        position: index + 1, // position 0 is the product's primary imageUrl
      })),
    });
  }

  // 2b) Product variants (upsert by variant sku) --------------------------------------
  for (const [sku, variants] of Object.entries(VARIANTS)) {
    const product = requireProduct(sku);
    for (const v of variants) {
      const vData = {
        productId: product.id,
        label: v.label,
        color: v.color ?? null,
        size: v.size ?? null,
        priceCents: v.priceCents,
        stock: v.stock,
        position: v.position,
        isActive: true,
      };
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: vData,
        create: { sku: v.sku, ...vData },
      });
    }
  }

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
          // variantId omitted (null) — these are zero-variant products, unchanged behaviour.
          return { productId: product.id, quantity: line.quantity };
        }),
      },
    },
  });

  // 4) Reviews (upsert on the composite [productId, userId]) ---------------------------
  for (const r of REVIEWS) {
    const product = requireProduct(r.sku);
    const rData = { rating: r.rating, title: r.title, body: r.body, createdAt: daysAgo(r.daysAgo) };
    await prisma.review.upsert({
      where: { productId_userId: { productId: product.id, userId: customer.id } },
      update: rData,
      create: { productId: product.id, userId: customer.id, ...rData },
    });
  }

  // 5) Addresses (no natural key → reset the demo customer's set, then recreate) -------
  await prisma.address.deleteMany({ where: { userId: customer.id } });
  await prisma.address.createMany({
    data: ADDRESSES.map((a) => ({ userId: customer.id, ...a })),
  });

  // 6) Wishlist (upsert on the composite [userId, productId]) --------------------------
  for (const sku of WISHLIST_SKUS) {
    const product = requireProduct(sku);
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: customer.id, productId: product.id } },
      update: {},
      create: { userId: customer.id, productId: product.id },
    });
  }

  // 7) CMS: article category + published articles (upsert by slug) ---------------------
  const articleCategory = await prisma.articleCategory.upsert({
    where: { slug: ARTICLE_CATEGORY.slug },
    update: { name: ARTICLE_CATEGORY.name },
    create: ARTICLE_CATEGORY,
  });
  for (const a of ARTICLES) {
    const aData = {
      title: a.title,
      excerpt: a.excerpt,
      body: a.body,
      coverUrl: unsplashUrl(a.cover),
      author: a.author,
      status: ArticleStatus.PUBLISHED,
      publishedAt: daysAgo(a.publishedDaysAgo),
      categoryId: articleCategory.id,
    };
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: aData,
      create: { slug: a.slug, ...aData },
    });
  }

  // 8) CMS: FAQ categories + items (categories upsert by slug; items reset per category) -
  for (const c of FAQ_CATEGORIES) {
    const category = await prisma.faqCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, position: c.position },
      create: { slug: c.slug, name: c.name, position: c.position },
    });
    await prisma.faqItem.deleteMany({ where: { categoryId: category.id } });
    await prisma.faqItem.createMany({
      data: c.items.map((item, index) => ({
        categoryId: category.id,
        question: item.question,
        body: item.body,
        position: index,
      })),
    });
  }

  // 9) CMS: static content blocks (upsert by key) -------------------------------------
  for (const block of CONTENT_BLOCKS) {
    await prisma.contentBlock.upsert({
      where: { key: block.key },
      update: { title: block.title, body: block.body },
      create: block,
    });
  }

  // 10) Report ------------------------------------------------------------------------
  const [
    userCount,
    productCount,
    orderCount,
    orderItemCount,
    cartCount,
    cartItemCount,
    imageCount,
    variantCount,
    reviewCount,
    addressCount,
    wishlistCount,
    articleCount,
    faqItemCount,
    contentBlockCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.cart.count(),
    prisma.cartItem.count(),
    prisma.productImage.count(),
    prisma.productVariant.count(),
    prisma.review.count(),
    prisma.address.count(),
    prisma.wishlistItem.count(),
    prisma.article.count(),
    prisma.faqItem.count(),
    prisma.contentBlock.count(),
  ]);

  /* eslint-disable no-console */
  console.log('Seed complete:');
  console.log(`  users:       ${userCount} (admin: ${admin.email}, customer: ${customer.email})`);
  console.log(`  products:    ${productCount} (+ ${imageCount} gallery images, ${variantCount} variants)`);
  console.log(`  orders:      ${orderCount} (+ ${orderItemCount} order items)`);
  console.log(`  carts:       ${cartCount} (+ ${cartItemCount} cart items)`);
  console.log(`  reviews:     ${reviewCount}`);
  console.log(`  addresses:   ${addressCount}`);
  console.log(`  wishlist:    ${wishlistCount} items`);
  console.log(`  cms:         ${articleCount} articles, ${faqItemCount} faq items, ${contentBlockCount} content blocks`);
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
