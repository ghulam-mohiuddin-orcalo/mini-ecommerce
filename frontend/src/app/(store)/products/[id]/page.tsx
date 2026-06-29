'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { formatPrice } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { useProduct } from '@/lib/hooks/useProducts';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading, isError, error, refetch } = useProduct(params.id);

  const notFound = isError && error instanceof ApiError && error.status === 404;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <button
        onClick={() => router.back()}
        className="mb-6 text-sm font-medium text-brand-700 hover:underline"
      >
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
            <img
              src={product.imageUrl}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                {product.category}
              </span>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
                {product.name}
              </h1>
            </div>

            <p className="text-2xl font-semibold text-brand-700">
              {formatPrice(product.priceCents)}
            </p>

            <div>
              {product.stock <= 0 ? (
                <Badge tone="danger">Out of stock</Badge>
              ) : product.stock <= 5 ? (
                <Badge tone="warning">Only {product.stock} left</Badge>
              ) : (
                <Badge tone="brand">In stock</Badge>
              )}
            </div>

            <p className="leading-relaxed text-muted">{product.description}</p>
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
