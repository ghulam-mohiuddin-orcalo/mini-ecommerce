export type Role = 'ADMIN' | 'CUSTOMER';

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  productId: string;
  productName: string;
  productImageUrl: string;
  variantId: string | null;
  variantLabel: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  totalCents: number;
  paymentRef: string | null;
  paidAt: string | null;
  createdAt: string;
  items: OrderItem[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface CartLine {
  productId: string;
  variantId: string | null;
  variantLabel: string | null;
  name: string;
  imageUrl: string;
  category: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  stock: number;
  available: boolean;
}

export interface Cart {
  id: string | null;
  items: CartLine[];
  totalCents: number;
  itemCount: number;
}

export interface AdminProductImage {
  id: string;
  url: string;
  alt: string | null;
  position: number;
}

export interface AdminProductVariant {
  id: string;
  label: string;
  color: string | null;
  size: string | null;
  priceCents: number;
  stock: number;
  sku: string;
  position: number;
  isActive: boolean;
}

export interface AdminProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  imageUrl: string;
  images: AdminProductImage[];
  variants: AdminProductVariant[];
  category: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
}

export interface AdminOrder {
  id: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
  customer: { id: string; name: string; email: string };
  items: OrderItem[];
}

export interface Analytics {
  totalSalesCents: number;
  totalOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  topProducts: { productId: string; productName: string; unitsSold: number }[];
  recentOrders: {
    id: string;
    customerName: string;
    totalCents: number;
    status: OrderStatus;
    createdAt: string;
  }[];
}

export interface Paginated2<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export type ProductBadge = 'NEW' | 'SALE' | 'BESTSELLER' | 'TRENDING';

export interface ProductImage {
  url: string;
  alt: string | null;
}

export interface ProductVariant {
  id: string;
  label: string;
  color: string | null;
  size: string | null;
  priceCents: number;
  stock: number;
  sku: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  imageUrl: string;
  images: ProductImage[];
  variants: ProductVariant[];
  category: string;
  stock: number;
  ratingAvg: number;
  ratingCount: number;
  badges: ProductBadge[];
  createdAt: string;
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  userName: string;
  createdAt: string;
}

export interface FeaturedReview extends Review {
  product: { id: string; name: string; imageUrl: string };
}

/** Lean product projection returned inside a wishlist entry. */
export interface WishlistProduct {
  id: string;
  name: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  imageUrl: string;
  category: string;
  stock: number;
}

export interface WishlistItem {
  id: string;
  createdAt: string;
  product: WishlistProduct;
}

export interface Wishlist {
  items: WishlistItem[];
  itemCount: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleCategoryRef {
  slug: string;
  name: string;
}

export interface ArticleCategoryWithCount extends ArticleCategoryRef {
  articleCount: number;
}

export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  author: string;
  publishedAt: string | null;
  category: ArticleCategoryRef | null;
}

export interface Article extends ArticleListItem {
  body: string;
  createdAt: string;
}

export interface FaqItem {
  id: string;
  question: string;
  body: string;
  position: number;
}

export interface FaqCategory {
  id: string;
  slug: string;
  name: string;
  position: number;
  items: FaqItem[];
}

export interface ContentBlock {
  key: string;
  title: string;
  body: string;
  updatedAt: string;
}

export interface ContactAcknowledgement {
  received: boolean;
  message: string;
}

export type RecommendationStrategy =
  | 'PURCHASE_HISTORY'
  | 'CART'
  | 'TOP_SELLERS'
  | 'RELATED_CATEGORY'
  | 'NONE';

export interface Recommendations {
  strategy: RecommendationStrategy;
  items: Product[];
}

export type ProductSort = 'newest' | 'price_asc' | 'price_desc';

export interface ProductQuery {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  /** Minimum average customer rating, 1–5 (server-side filter). */
  minRating?: number;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}
