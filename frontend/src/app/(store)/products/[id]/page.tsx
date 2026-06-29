'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { QuantitySelector } from '@/components/store/QuantitySelector';
import { RecommendationsSection } from '@/components/store/RecommendationsSection';
import { formatPrice } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { useProduct } from '@/lib/hooks/useProducts';
import { useRelatedProducts } from '@/lib/hooks/useRecommendations';
import { useMe } from '@/lib/hooks/useAuth';
import { useAddToCart } from '@/lib/hooks/useCart';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading, isError, error, refetch } = useProduct(params.id);
  const related = useRelatedProducts(params.id);
  const { data: user } = useMe();
  const addToCart = useAddToCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const notFound = isError && error instanceof ApiError && error.status === 404;
  const outOfStock = (product?.stock ?? 0) <= 0;

  const onAdd = () => {
    if (!product) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setAdded(false);
    addToCart.mutate(
      { productId: product.id, quantity: qty },
      { onSuccess: () => setAdded(true) },
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <button
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      {isLoading ? (
        <DetailSkeleton />
      ) : notFound ? (
        <EmptyState
          title="Product not found"
          description="It may have been removed or is no longer available."
          action={
            <Link href="/products">
              <Button variant="secondary">Browse the catalog</Button>
            </Link>
          }
        />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : product ? (
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#f0f5f2] to-[#dceae3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.imageUrl} alt={product.name} className="aspect-square w-full object-cover" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-[0.07em] text-muted">
              {product.category}
            </span>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-[34px]">
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3.5">
              <span className="text-3xl font-extrabold tracking-tight text-brand-700">
                {formatPrice(product.priceCents)}
              </span>
              {outOfStock ? (
                <Badge tone="danger" dot>
                  Out of stock
                </Badge>
              ) : product.stock <= 5 ? (
                <Badge tone="warning" dot>
                  Only {product.stock} left
                </Badge>
              ) : (
                <Badge tone="brand" dot>
                  In stock · {product.stock} available
                </Badge>
              )}
            </div>

            <p className="mt-5 leading-relaxed text-ink-soft">{product.description}</p>

            {!outOfStock && (
              <>
                <div className="my-7 h-px bg-line" />
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3.5">
                    <QuantitySelector
                      value={qty}
                      onChange={setQty}
                      min={1}
                      max={product.stock}
                      size="lg"
                    />
                    <Button onClick={onAdd} disabled={addToCart.isPending} size="lg" className="flex-1">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                        <path d="M6 6h15l-1.5 9h-12z" />
                        <circle cx="9" cy="20" r="1.4" />
                        <circle cx="18" cy="20" r="1.4" />
                        <path d="M6 6 5 2H2" />
                      </svg>
                      {addToCart.isPending ? 'Adding…' : user ? 'Add to cart' : 'Sign in to add'}
                    </Button>
                  </div>

                  {addToCart.isError && (
                    <p role="alert" className="text-sm text-[color:var(--color-danger)]">
                      {addToCart.error instanceof ApiError ? addToCart.error.message : 'Could not add to cart'}
                    </p>
                  )}
                  {added && !addToCart.isPending && !addToCart.isError && (
                    <p role="status" className="flex items-center gap-2 text-sm text-[color:var(--color-success)]">
                      ✓ Added to cart.{' '}
                      <Link href="/cart" className="font-medium underline">View cart</Link>
                    </p>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2.5">
                  <TrustItem>Free 30-day returns</TrustItem>
                  <TrustItem>Dispatched within 24h</TrustItem>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {product && (
        <div className="mt-16">
          <RecommendationsSection
            title="You might also like"
            products={related.data?.items}
            isLoading={related.isLoading}
          />
        </div>
      )}
    </div>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-soft">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-500)" strokeWidth="2" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {children}
    </span>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
