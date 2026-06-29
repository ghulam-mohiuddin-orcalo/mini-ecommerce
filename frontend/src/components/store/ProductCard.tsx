import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#f0f5f2] to-[#dceae3]">
        {/* Plain img keeps us resilient (no remote-image config / offline failures break layout). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {outOfStock && (
          <span className="absolute left-3 top-3">
            <Badge tone="danger">Out of stock</Badge>
          </span>
        )}
        {lowStock && (
          <span className="absolute left-3 top-3">
            <Badge tone="warning">Low stock</Badge>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          {product.category}
        </span>
        <h3 className="line-clamp-1 font-bold tracking-tight text-ink">{product.name}</h3>
        <p className="line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted">
          {product.description}
        </p>
        <p className="pt-2.5 text-lg font-extrabold tracking-tight text-brand-700">
          {formatPrice(product.priceCents)}
        </p>
      </div>
    </Link>
  );
}
