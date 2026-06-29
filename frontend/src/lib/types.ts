export type Role = 'ADMIN' | 'CUSTOMER';

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  productId: string;
  productName: string;
  productImageUrl: string;
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

export interface AdminProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
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

export interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  category: string;
  stock: number;
  createdAt: string;
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

export type ProductSort = 'newest' | 'price_asc' | 'price_desc';

export interface ProductQuery {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}
