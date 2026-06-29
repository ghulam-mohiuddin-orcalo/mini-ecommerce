'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { QuantitySelector } from '@/components/store/QuantitySelector';
import { formatPrice } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { useProduct } from '@/lib/hooks/useProducts';
import { useMe } from '@/lib/hooks/useAuth';
import { useAddToCart } from '@/lib/hooks/useCart';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading, isError, error, refetch } = useProduct(params.id);
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
      <button onClick={() => router.back()} className="mb-6 text-sm font-medium text-brand-700 hover:underline">
        ← Back
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
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-line bg-brand-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.imageUrl} alt={product.name} className="aspect-square w-full object-cover" />
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted">{product.category}</span>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">{product.name}</h1>
            </div>

            <p className="text-2xl font-semibold text-brand-700">{formatPrice(product.priceCents)}</p>

            <div>
              {outOfStock ? (
                <Badge tone="danger">Out of stock</Badge>
              ) : product.stock <= 5 ? (
                <Badge tone="warning">Only {product.stock} left</Badge>
              ) : (
                <Badge tone="brand">In stock</Badge>
              )}
            </div>

            <p className="leading-relaxed text-muted">{product.description}</p>

            {!outOfStock && (
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <QuantitySelector value={qty} onChange={setQty} min={1} max={product.stock} />
                  <Button onClick={onAdd} disabled={addToCart.isPending} size="lg">
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
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
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
